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

from app.solicitacoes.models import Solicitacao, InteracaoTimeline, AnexoArquivo, StatusOS, TipoEventoTimeline, obter_timestamp_utc_naive
from app.auth.models import Usuario

# Unificação de diretório inteligente e cross-platform isolado para ambiente de desenvolvimento Windows
UPLOAD_DIR = os.path.join(".data", "uploads")

class SolicitacaoService:
    
    @staticmethod
    async def criar_chamado(
        db: AsyncSession, 
        usuario_id: int, 
        titulo: str, 
        descricao: str, 
        categoria: str,
        campus: str,
        bloco: str,
        sala: str,
        arquivo: Optional[UploadFile] = None
    ) -> Solicitacao:
        """Instancia um chamado gerando o rastro de abertura inicial e processando anexo opcional."""
        
        # 1. Criação da Entidade Base com o modelo geográfico adaptado
        nova_os = Solicitacao(
            titulo=titulo,
            descricao=descricao,
            categoria=categoria,
            campus=campus,
            bloco=bloco,
            sala=sala,
            status=StatusOS.PENDENTE,
            usuario_id=usuario_id
        )
        db.add(nova_os)
        await db.flush()  # Garante a geração do ID da OS para os relacionamentos seguintes

        # 2. Histórico Inicial na Timeline
        evento_abertura = InteracaoTimeline(
            solicitacao_id=nova_os.id,
            autor_id=usuario_id,
            tipo_evento=TipoEventoTimeline.MUDANCA_STATUS,
            conteudo=f"Abertura de Chamado realizada com sucesso no local: {campus} | {bloco} | Sala {sala}."
        )
        db.add(evento_abertura)

        # 3. Processamento de Imagem/Anexo Opcional na abertura
        if arquivo and arquivo.filename and len(arquivo.filename.strip()) > 0:
            if not os.path.exists(UPLOAD_DIR):
                os.makedirs(UPLOAD_DIR)

            # Prevenção de ponteiro morto: reset do cursor antes da leitura
            await arquivo.seek(0)
            conteudo_arquivo = await arquivo.read()
            await arquivo.seek(0) # Mantém o arquivo restaurado para rotas subsequentes
            
            # Otimização de Armazenamento por Deduplicação de Hash
            sha256_hash = hashlib.sha256(conteudo_arquivo).hexdigest()
            result_hash = await db.execute(select(AnexoArquivo).where(AnexoArquivo.file_hash == sha256_hash))
            if result_hash.scalars().first():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST, 
                    detail="Este arquivo já foi anexado à base de dados."
                )

            # Extração e normalização estrita da extensão para evitar dessincronização com o frontend
            tipo_mime = str(arquivo.content_type).lower() if arquivo.content_type else ""
            if "jpeg" in tipo_mime or "jpg" in tipo_mime:
                extensao = ".jpeg"
            elif "png" in tipo_mime:
                extensao = ".png"
            elif "gif" in tipo_mime:
                extensao = ".gif"
            elif "pdf" in tipo_mime:
                extensao = ".pdf"
            else:
                extensao = os.path.splitext(arquivo.filename)[1].lower()
                if not extensao:
                    extensao = ".jpeg"

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
                solicitacao_id=nova_os.id,
                nome_original=arquivo.filename,
                nome_armazenado=nome_armazenado,
                caminho_fisico=caminho_completo,
                tipo_mime=str(arquivo.content_type or "image/jpeg"),
                tamanho_bytes=len(conteudo_arquivo),
                file_hash=sha256_hash
            )
            db.add(novo_anexo)

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
        """Registra comunicações internas em andamento salvando arquivos físicos em disco."""
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

        if arquivo and arquivo.filename and len(arquivo.filename.strip()) > 0:
            if not os.path.exists(UPLOAD_DIR):
                os.makedirs(UPLOAD_DIR)

            await arquivo.seek(0)
            conteudo_arquivo = await arquivo.read()
            await arquivo.seek(0)

            sha256_hash = hashlib.sha256(conteudo_arquivo).hexdigest()
            result_hash = await db.execute(select(AnexoArquivo).where(AnexoArquivo.file_hash == sha256_hash))
            if result_hash.scalars().first():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST, 
                    detail="Este arquivo já foi anexado à base de dados."
                )

            # Extração e normalização estrita da extensão para interações de linha do tempo
            tipo_mime = str(arquivo.content_type).lower() if arquivo.content_type else ""
            if "jpeg" in tipo_mime or "jpg" in tipo_mime:
                extensao = ".jpeg"
            elif "png" in tipo_mime:
                extensao = ".png"
            elif "gif" in tipo_mime:
                extensao = ".gif"
            elif "pdf" in tipo_mime:
                extensao = ".pdf"
            else:
                extensao = os.path.splitext(arquivo.filename)[1].lower()
                if not extensao:
                    extensao = ".jpeg"

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
                tipo_mime=str(arquivo.content_type or "image/jpeg"),
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
        """Executa a mudança de status operacional do chamado, aplicando auto-atribuição técnica."""
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
        
        if status_normalizado == StatusOS.EM_ATENDIMENTO and os_alvo.tecnico_id is None:
            os_alvo.tecnico_id = operador.id

        log_sistema = InteracaoTimeline(
            solicitacao_id=os_alvo.id,
            autor_id=operador.id,
            tipo_evento=TipoEventoTimeline.MUDANCA_STATUS,
            conteudo=f"Alteração de Status: De '{status_anterior}' para '{status_normalizado.value}' (Operador: {operador.usuario_id})."
        )
        db.add(log_sistema)
        await db.commit()
        
        return os_alvo