
import type { Timestamp } from 'firebase/firestore';

export interface Cliente {
  id?: string;
  nomeRazaoSocial: string;
  nomeFantasia?: string;
  tipo: {
    cliente: boolean;
    mecanico: boolean;
  };
  status: 'Ativo' | 'Inativo';
  observacao?: string;
}

export interface Fornecedor {
  id?: string;
  razaoSocial: string;
  nomeFantasia?: string;
  cnpj: string;
  status: 'Ativo' | 'Inativo';
  observacao?: string;
}

export interface Peca {
  id?: string;
  codigoPeca: string;
  descricao: string;
  status: 'Ativo' | 'Inativo';
  observacao?: string;
}

interface MovimentacaoBase {
  id?: string;
  tipoMovimentacao: 'Devolução' | 'Garantia';
  pecaId: string;
  pecaDescricao: string; // Denormalized
  quantidade: number;
  clienteId: string;
  clienteNome: string; // Denormalized
  mecanicoId: string;
  mecanicoNome: string; // Denormalized
  dataVenda: Timestamp;
  dataMovimentacao: Timestamp;
  requisicaoVenda: string;
  observacao?: string;
}

export interface MovimentacaoDevolucao extends MovimentacaoBase {
  tipoMovimentacao: 'Devolução';
  acaoRequisicao: 'Alterada' | 'Excluída';
}

export interface MovimentacaoGarantia extends MovimentacaoBase {
  tipoMovimentacao: 'Garantia';
  fornecedorId: string;
  fornecedorNome: string; // Denormalized
  defeitoRelatado: string;
  nfSaida: string;
  nfCompra: string;
  valorPeca: number;
  nfRetorno: string;
  acaoRetorno: 'Pendente' | 'Aprovada' | 'Recusada';
}

export type Movimentacao = MovimentacaoDevolucao | MovimentacaoGarantia;
