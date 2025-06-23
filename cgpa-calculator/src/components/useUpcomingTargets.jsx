import { useEffect, useState } from "react";
import { db } from "../utils/firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";

export const useUpcomingTargets = (uid) => {
  const [targets, setTargets] = useState([]);
  useEffect(() => {
    const q = query(collection(db, "users", uid, "targets"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      setTargets(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
  }, [uid]);
  return targets;
};
