"""
Camada de Serviços e Métodos Operacionais de Ordens de Serviço (Service Layer).

Concentra a lógica transacional pesada, regras físicas de upload e 
mecanismos criptográficos para evitar redundâncias de arquivos no volume do servidor.
"""

import os
import uuid
import hashlib
from typing import Optional
from fastapi import UploadFile, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.sql import func

from app.solicitacoes.models import Solicitacao, InteracaoTimeline, AnexoArquivo, StatusOS, PrioridadeOS, TipoEventoTimeline
from app.auth.models import Usuario

UPLOAD_DIR = "/app/uploads"

class SolicitacaoService:
    
    @staticmethod
    async def criar_chamado(
        db: AsyncSession, 
        usuario_id: int, 
        titulo: str, 
        descricao: str, 
        prioridade: str
    ) -> Solicitacao:
        """Instancia um chamado gerando o rastro de abertura inicial na timeline."""
        prioridade_enum = PrioridadeOS.normalizar(prioridade)
        
        nova_os = Solicitacao(
            titulo=titulo,
            descricao=descricao,
            prioridade=prioridade_enum,
            status=StatusOS.PENDENTE,
            usuario_id=usuario_id
        )
        db.add(nova_os)
        await db.flush()

        evento_abertura = InteracaoTimeline(
            solicitacao_id=nova_os.id,
            autor_id=usuario_id,
            tipo_evento=TipoEventoTimeline.MUDANCA_STATUS,
            conteudo=f"Abertura de Chamado. Status: PENDENTE | Prioridade: {prioridade_enum.value}."
        )
        db.add(evento_abertura)
        await db.commit()
        
        return nova_os

    @staticmethod
    async def registrar_interacao_com_upload(
        db: AsyncSession,
        solicitacao: Solicitacao,
        autor: Usuario,
        mensagem: str,
        arquivo: Optional[UploadFile] = None
    ) -> InteracaoTimeline:
        """
        Registra comunicações internas salvando arquivos físicos em disco.

        Raises:
            HTTPException 403: Caso o chamado já se encontre arquivado/resolvido.
            HTTPException 400: Se o hash criptográfico acusar duplicidade do anexo.
        """
        if solicitacao.status in [StatusOS.RESOLVIDO, StatusOS.CANCELADO]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operação bloqueada: Ordem de Serviço já finalizada e arquivada."
            )

        nova_interacao = InteracaoTimeline(
            solicitacao_id=solicitacao.id,
            autor_id=autor.id,
            tipo_evento=TipoEventoTimeline.MENSAGEM,
            conteudo=mensagem
        )
        db.add(nova_interacao)
        await db.flush()

        if arquivo and arquivo.filename:
            if not os.path.exists(UPLOAD_DIR):
                os.makedirs(UPLOAD_DIR)

            conteudo_arquivo = await arquivo.read()
            
            # "PORQUÊ" (OTIMIZAÇÃO DE DISCO): Calcula o hash SHA-256 binário do arquivo.
            # Caso outro chamado possua exatamente o mesmo anexo (mesmo hash), a API barra a transação.
            # Isso impede o entupimento redundante do volume físico de uploads do servidor Docker.
            sha256_hash = hashlib.sha256(conteudo_arquivo).hexdigest()
            result_hash = await db.execute(select(AnexoArquivo).where(AnexoArquivo.file_hash == sha256_hash))
            if result_hash.scalars().first():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST, 
                    detail="Este arquivo já foi anexado à base de dados."
                )

            extensao = os.path.splitext(arquivo.filename)[1]
            nome_armazenado = f"{uuid.uuid4()}{extensao}"
            caminho_completo = os.path.join(UPLOAD_DIR, nome_armazenado)

            try:
                with open(caminho_completo, "wb") as f:
                    f.write(conteudo_arquivo)
            except Exception:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                    detail="Falha física no volume de armazenamento do servidor."
                )

            novo_anexo = AnexoArquivo(
                solicitacao_id=solicitacao.id,
                nome_original=arquivo.filename,
                nome_armazenado=nome_armazenado,
                caminho_fisico=caminho_completo,
                tipo_mime=arquivo.content_type,
                tamanho_bytes=len(conteudo_arquivo),
                file_hash=sha256_hash
            )
            db.add(novo_anexo)

        solicitacao.atualizado_em = obter_timestamp_utc_naive()
        await db.commit()
        
        return nova_interacao

    @staticmethod
    async def atualizar_status_os(
        db: AsyncSession, 
        solicitacao_id: int, 
        novo_status: str, 
        operador: Usuario
    ) -> Solicitacao:
        """
        Executa a mudança de status operacional do chamado, aplicando auto-atribuição técnica.
        """
        result = await db.execute(select(Solicitacao).where(Solicitacao.id == solicitacao_id))
        os_alvo = result.scalars().first()
        
        if not os_alvo:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ordem de Serviço não localizada.")

        if os_alvo.status == StatusOS.RESOLVIDO:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Regra de Negócio: Impede alteração de estado para chamados finalizados."
              )

        status_anterior = str(os_alvo.status)
        status_normalizado = StatusOS.normalizar(novo_status)
        
        os_alvo.status = status_normalizado
        os_alvo.atualizado_em = obter_timestamp_utc_naive()
        
        # Auto-Associação: Se um técnico puxou o chamado, ele se torna o dono da OS.
        if status_normalizado == StatusOS.EM_ATENDIMENTO and os_alvo.tecnico_id is None:
            os_alvo.tecnico_id = operador.id

        log_sistema = InteracaoTimeline(
            solicitacao_id=os_alvo.id,
            autor_id=operador.id,
            tipo_evento=TipoEventoTimeline.MUDANCA_STATUS,
            conteudo=f"Alteração de Status: De '{status_anterior}' para '{status_normalizado.value}' (Operador: {operador.nome_completo})."
        )
        db.add(log_sistema)
        await db.commit()
        
        return os_alvo