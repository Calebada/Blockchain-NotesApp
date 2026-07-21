import axios, { AxiosError } from "axios";
import { API_BASE_URL } from "../../../config/api";
import type {
  ChainResponse,
  NoteActivityResponse,
  WalletTransactionsResponse,
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

export async function fetchActivity(walletAddress?: string | null) {
  const response = await axios.get<NoteActivityResponse>(`${API_BASE_URL}/activity`, {
    params: walletAddress ? { walletAddress } : undefined,
  });
  return response.data;
}

export async function fetchWalletTransactions(walletAddress?: string | null) {
  const response = await axios.get<WalletTransactionsResponse>(
    `${API_BASE_URL}/wallet/transactions`,
    {
      params: walletAddress ? { walletAddress } : undefined,
    }
  );
  return response.data;
}

export async function addNote({
  author,
  title,
  tag,
  content,
  walletAddress,
}: CreateNoteRequest) {
  await axios.post(`${API_BASE_URL}/notes`, {
    author,
    title,
    tag,
    content,
    walletAddress,
  });
}

export async function updateNote({
  id,
  author,
  title,
  tag,
  content,
  walletAddress,
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
  });
}

export async function deleteNote(id?: string, walletAddress?: string | null) {
  if (!id) {
    throw new Error("A backend note ID is required to delete this note.");
  }

  await axios.delete(`${API_BASE_URL}/notes/${id}`, {
    data: { walletAddress },
  });
}

export async function restoreNote(id?: string, walletAddress?: string | null) {
  if (!id) {
    throw new Error("A backend note ID is required to restore this note.");
  }

  await axios.post(`${API_BASE_URL}/notes/${id}/restore`, {
    walletAddress,
  });
}

export async function hardDeleteNote(id?: string, walletAddress?: string | null) {
  if (!id) {
    throw new Error("A backend note ID is required to permanently delete this note.");
  }

  await axios.delete(`${API_BASE_URL}/notes/${id}/permanent`, {
    data: { walletAddress },
  });
}

export function getApiError(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiError>;
    return axiosError.response?.data?.error || fallback;
  }

  return fallback;
}
