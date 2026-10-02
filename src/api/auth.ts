import { useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { postForm, postJson, request } from "./client";
import { clearToken, getToken, setToken, subscribe } from "./token";
import type { TokenResponse, User } from "./types";

// Who is logged in. Any component can call this; they all share one cached answer.
export function useAuth() {
  const token = useSyncExternalStore(subscribe, getToken);
  const query = useQuery({
    queryKey: ["me"],
    queryFn: () => request<User>("/auth/me"),
    enabled: token !== null,
    retry: false, // a rejected token will not fix itself
    staleTime: Infinity, // the user's name and role do not change while they browse
  });

  return {
    user: token !== null ? query.data ?? null : null,
    isLoading: token !== null && query.isPending,
  };
}

export function register(data: {
  email: string;
  full_name: string;
  password: string;
}) {
  return postJson<User>("/auth/register", data);
}

export async function login(email: string, password: string) {
  // The backend follows the OAuth2 standard, which calls the field "username".
  const result = await postForm<TokenResponse>("/auth/login", {
    username: email,
    password,
  });
  setToken(result.access_token);
}

export function logout() {
  clearToken();
}
