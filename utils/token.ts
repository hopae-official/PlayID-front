const ACCESS_TOKEN = "accessToken";

export const getToken = () => {
  return localStorage.getItem(ACCESS_TOKEN);
};

export const saveToken = (token: string) => {
  localStorage.setItem(ACCESS_TOKEN, token);
};

export const removeToken = () => {
  localStorage.removeItem(ACCESS_TOKEN);
};
