import axios, { AxiosError } from "axios";
import { API_BASE_URL } from "../../../config/api";
import type { ChainResponse } from "../../../types/blockchain";
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

export async function addNote({ author, title, tag, content }: CreateNoteRequest) {
  await axios.post(`${API_BASE_URL}/notes`, {
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

  await axios.put(`${API_BASE_URL}/notes/${id}`, {
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

  await axios.delete(`${API_BASE_URL}/notes/${id}`);
}

export async function restoreNote(id?: string) {
  if (!id) {
    throw new Error("A backend note ID is required to restore this note.");
  }

  await axios.post(`${API_BASE_URL}/notes/${id}/restore`);
}

export async function hardDeleteNote(id?: string) {
  if (!id) {
    throw new Error("A backend note ID is required to permanently delete this note.");
  }

  await axios.delete(`${API_BASE_URL}/notes/${id}/permanent`);
}

export function getApiError(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiError>;
    return axiosError.response?.data?.error || fallback;
  }

  return fallback;
}
