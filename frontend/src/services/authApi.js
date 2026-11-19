
import API from "./api";

export async function registerAccount(details) {
  const { data } = await API.post("/auth/register", details);
  return data;
}

export async function loginAccount(credentials) {
  const { data } = await API.post("/auth/login", credentials);
  return data;
}

export async function getCurrentUser() {
  const { data } = await API.get("/auth/me");
  return data.user;
}

export async function logoutAccount() {
  const { data } = await API.post(
    "/auth/logout",
    {},
    {
      headers: {
        "X-GapWise-Request": "1",
      },
    }
  );

  return data;
}
