import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getPlayIdToken } from "@/queries/token";
import { toast } from "sonner";
import { useClerk } from "@clerk/clerk-react";

const Auth = () => {
  const navigate = useNavigate();
  const { signOut } = useClerk();
  const { isSuccess, isError } = getPlayIdToken();

  useEffect(() => {
    if (isSuccess) {
      navigate("/bracket");
    }
  }, [isSuccess, navigate]);

  useEffect(() => {
    if (isError) {
      toast.error("로그인에 실패했습니다.");
      signOut();
      navigate("/sign-in");
    }
  }, [isError]);

  return <div></div>;
};

export default Auth;
