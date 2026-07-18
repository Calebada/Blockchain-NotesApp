import axios, { AxiosError } from "axios";
import type { ChainResponse } from "../types/blockchain";

type ApiError = {
  error?: string;
};

const API_URL = "http://localhost:5000/api";

export async function fetchChain() {
  const response = await axios.get<ChainResponse>(`${API_URL}/chain`);
  return response.data;
}

export async function addNote({ author, content }: { author: string; content: string }) {
  await axios.post(`${API_URL}/notes`, {
    author,
    content,
  });
}

export function getApiError(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiError>;
    return axiosError.response?.data?.error || fallback;
  }

  return fallback;
}
