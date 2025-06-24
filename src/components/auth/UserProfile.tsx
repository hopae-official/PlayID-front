import { useUser } from '@clerk/clerk-react';

export default function UserProfile() {
  const { user } = useUser();

  if (!user) return null;

  return (
    <div>
      <p>안녕하세요, {user.fullName}님!</p>
      <p>이메일: {user.primaryEmailAddress?.emailAddress}</p>
    </div>
  );
}