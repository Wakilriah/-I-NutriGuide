import axios from "axios";

const NETWORK_ERROR_MESSAGE = "Cannot reach the API. Make sure the backend is running and your phone is on the same Wi-Fi.";

export function getAuthErrorMessage(error: unknown, fallback: string, options?: { hideServerMessage?: boolean }) {
  if (!axios.isAxiosError(error)) {
    return fallback;
  }

  if (!error.response) {
    return NETWORK_ERROR_MESSAGE;
  }

  if (options?.hideServerMessage) {
    return fallback;
  }

  const data = error.response.data as { email?: string[] | string; detail?: string; non_field_errors?: string[] | string } | undefined;
  const emailError = Array.isArray(data?.email) ? data.email[0] : data?.email;
  const formError = Array.isArray(data?.non_field_errors) ? data.non_field_errors[0] : data?.non_field_errors;

  return emailError ?? formError ?? data?.detail ?? fallback;
}
