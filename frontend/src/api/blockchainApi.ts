import axios, { AxiosError } from "axios";
import type { ChainResponse, CreateNoteRequest, UpdateNoteRequest } from "../types/blockchain";

type ApiError = {
  error?: string;
};

const API_URL = "http://localhost:5000/api";

export async function fetchChain() {
  const response = await axios.get<ChainResponse>(`${API_URL}/chain`);
  return response.data;
}

export async function addNote({ author, content }: CreateNoteRequest) {
  await axios.post(`${API_URL}/notes`, {
    author,
    content,
  });
}

export async function updateNote({
  id,
  author,
  content,
}: UpdateNoteRequest) {
  if (!id) {
    throw new Error("A backend note ID is required to edit this note.");
  }

  await axios.put(`${API_URL}/notes/${id}`, {
    author,
    content,
  });
}

export async function deleteNote(id?: string) {
  if (!id) {
    throw new Error("A backend note ID is required to delete this note.");
  }

  await axios.delete(`${API_URL}/notes/${id}`);
}

export function getApiError(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiError>;
    return axiosError.response?.data?.error || fallback;
  }

  return fallback;
}
