import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getPlayIdToken } from "@/queries/token";
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
      signOut();
      navigate("/sign-in");
    }
  }, [isError]);

  return <div></div>;
};

export default Auth;
