import axios, { AxiosError } from "axios";
import { API_BASE_URL } from "../../../config/api";
import type {
  ChainResponse,
  BlockchainProof,
  NoteActivityResponse,
  NoteTransactionIntent,
  PreparedNoteTransaction,
} from "../../../types/blockchain";
import type { CreateNoteRequest, UpdateNoteRequest } from "../types/note";

type ApiError = {
  error?: string;
};

export async function fetchChain() {
  const response = await axios.get<ChainResponse>(`${API_BASE_URL}/chain`);
  return response.data;
}

export async function fetchTrash() {
  const response = await axios.get<ChainResponse>(`${API_BASE_URL}/notes/trash`);
  return response.data;
}

export async function fetchActivity(
  walletAddress?: string | null,
  pagination: { page: number; pageSize: number } = { page: 1, pageSize: 10 }
) {
  const response = await axios.get<NoteActivityResponse>(`${API_BASE_URL}/activity`, {
    params: walletAddress
      ? { walletAddress, page: pagination.page, pageSize: pagination.pageSize }
      : undefined,
  });
  return response.data;
}

export async function prepareNoteTransaction(
  intent: NoteTransactionIntent & {
    walletAddress: string;
    utxos: string[];
    changeAddress: string;
  }
) {
  const response = await axios.post<PreparedNoteTransaction>(
    `${API_BASE_URL}/transactions/prepare`,
    intent
  );
  return response.data;
}

export async function submitNoteTransaction(unsignedTx: string, witnessSet: string) {
  const response = await axios.post<Omit<BlockchainProof, "proofHash" | "validUntilSlot">>(
    `${API_BASE_URL}/transactions/submit`,
    { unsignedTx, witnessSet }
  );
  return response.data;
}

export async function addNote({
  author,
  title,
  tag,
  content,
  walletAddress,
  ...chainProof
}: CreateNoteRequest) {
  await axios.post(`${API_BASE_URL}/notes`, {
    author,
    title,
    tag,
    content,
    walletAddress,
    ...chainProof,
  });
}

export async function updateNote({
  id,
  author,
  title,
  tag,
  content,
  walletAddress,
  ...chainProof
}: UpdateNoteRequest) {
  if (!id) {
    throw new Error("A backend note ID is required to edit this note.");
  }

  await axios.put(`${API_BASE_URL}/notes/${id}`, {
    author,
    title,
    tag,
    content,
    walletAddress,
    ...chainProof,
  });
}

export async function deleteNote(
  id: string | undefined,
  walletAddress: string | null | undefined,
  chainProof: BlockchainProof
) {
  if (!id) {
    throw new Error("A backend note ID is required to delete this note.");
  }

  await axios.delete(`${API_BASE_URL}/notes/${id}`, {
    data: { walletAddress, ...chainProof },
  });
}

export async function restoreNote(
  id: string | undefined,
  walletAddress: string | null | undefined,
  chainProof: BlockchainProof
) {
  if (!id) {
    throw new Error("A backend note ID is required to restore this note.");
  }

  await axios.post(`${API_BASE_URL}/notes/${id}/restore`, {
    walletAddress,
    ...chainProof,
  });
}

export async function hardDeleteNote(
  id: string | undefined,
  walletAddress: string | null | undefined,
  chainProof: BlockchainProof
) {
  if (!id) {
    throw new Error("A backend note ID is required to permanently delete this note.");
  }

  await axios.delete(`${API_BASE_URL}/notes/${id}/permanent`, {
    data: { walletAddress, ...chainProof },
  });
}

export function getApiError(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiError>;
    return axiosError.response?.data?.error || fallback;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
