import { userControllerSignInWithClerk } from "@/api";
import { saveToken } from "@/utils/token";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";

export const getPlayIdToken = () => {
  const { getToken, isSignedIn } = useAuth();
  return useQuery({
    queryKey: ["playIdToken"],
    queryFn: async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error("No token");
        const res = await userControllerSignInWithClerk({ clerkToken: token });
        if (!res.access_token) throw new Error("No access token");
        saveToken(res.access_token);
        return res;
      } catch (err) {
        throw err;
      }
    },
    enabled: isSignedIn,
    retry: false,
  });
};
