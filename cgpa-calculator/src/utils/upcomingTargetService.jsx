import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase"

export const saveUpcomingTarget = async (uid, semester, targetSPI, courses) => {
  const ref = collection(db, "users", uid, "targets");
  await addDoc(ref, {
    semester,
    targetSPI,
    courses,
    createdAt: serverTimestamp()
  });
};
