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

export async function fetchTrash() {
  const response = await axios.get<ChainResponse>(`${API_URL}/notes/trash`);
  return response.data;
}

export async function addNote({ author, title, tag, content }: CreateNoteRequest) {
  await axios.post(`${API_URL}/notes`, {
    author,
    title,
    tag,
    content,
  });
}

export async function updateNote({
  id,
  author,
  title,
  tag,
  content,
}: UpdateNoteRequest) {
  if (!id) {
    throw new Error("A backend note ID is required to edit this note.");
  }

  await axios.put(`${API_URL}/notes/${id}`, {
    author,
    title,
    tag,
    content,
  });
}

export async function deleteNote(id?: string) {
  if (!id) {
    throw new Error("A backend note ID is required to delete this note.");
  }

  await axios.delete(`${API_URL}/notes/${id}`);
}

export async function restoreNote(id?: string) {
  if (!id) {
    throw new Error("A backend note ID is required to restore this note.");
  }

  await axios.post(`${API_URL}/notes/${id}/restore`);
}

export async function hardDeleteNote(id?: string) {
  if (!id) {
    throw new Error("A backend note ID is required to permanently delete this note.");
  }

  await axios.delete(`${API_URL}/notes/${id}/permanent`);
}

export function getApiError(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiError>;
    return axiosError.response?.data?.error || fallback;
  }

  return fallback;
}
