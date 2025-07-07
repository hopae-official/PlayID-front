import { SignUp } from "@clerk/clerk-react";

const CustomSignUp = () => {
  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <SignUp
        path="/sign-up"
        signInUrl="/sign-in"
        fallbackRedirectUrl={"/auth"}
      />
    </div>
  );
};

export default CustomSignUp;
