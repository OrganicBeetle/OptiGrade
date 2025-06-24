import { useState, useEffect } from "react";
import { db } from "../utils/firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  arrayUnion,
  getDoc,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";
import { FiUserPlus } from "react-icons/fi";

const AddFriend = ({ refreshKey = 0 }) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [friendData, setFriendData] = useState({});
  const [requesting, setRequesting] = useState({});

  // Search users by name or email
  useEffect(() => {
    if (searchTerm.trim().length === 0) {
      setResults([]);
      return;
    }

    const fetchUsers = async () => {
      setLoading(true);
      const snap = await getDocs(collection(db, "users"));
      const matches = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        const uid = docSnap.id;

        if (
          uid !== user.uid &&
          (data.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            data.email?.toLowerCase().includes(searchTerm.toLowerCase()))
        ) {
          matches.push({ uid, ...data });
        }
      });

      setResults(matches);
      setLoading(false);
    };

    const delayDebounce = setTimeout(fetchUsers, 500);
    return () => clearTimeout(delayDebounce);
  }, [searchTerm, user.uid]);

  // Fetch friend info (friends and outgoing requests)
  useEffect(() => {
    const fetchFriendInfo = async () => {
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setFriendData(docSnap.data());
      }
    };
    fetchFriendInfo();
  }, [user.uid, refreshKey]);

  const handleSendRequest = async (targetUid) => {
    if (!targetUid) return;
    setRequesting((prev) => ({ ...prev, [targetUid]: true }));

    try {
      await updateDoc(doc(db, "users", user.uid), {
        "friendRequests.outgoing": arrayUnion(targetUid),
      });

      await updateDoc(doc(db, "users", targetUid), {
        "friendRequests.incoming": arrayUnion(user.uid),
      });

      toast.success("Friend request sent!");

      setFriendData((prev) => ({
        ...prev,
        friendRequests: {
          ...prev.friendRequests,
          outgoing: [...(prev.friendRequests?.outgoing || []), targetUid],
        },
      }));
    } catch (err) {
      console.error(err);
      toast.error("Failed to send request");
    } finally {
      setRequesting((prev) => ({ ...prev, [targetUid]: false }));
    }
  };

  const alreadyFriends = (uid) => friendData?.friends?.includes(uid) ?? false;
  const alreadySent = (uid) =>
    friendData?.friendRequests?.outgoing?.includes(uid) ?? false;

  return (
    <div className="max-w-xl mx-auto p-6 bg-white/80 backdrop-blur rounded-2xl shadow-xl mt-8">
      <div className="flex items-center gap-2 mb-4">
        <FiUserPlus className="text-blue-600 text-2xl" />
        <h2 className="text-2xl font-semibold text-blue-700">Add Friends</h2>
      </div>
      <input
        type="text"
        placeholder="Search by name or email"
        className="w-full p-2 border border-blue-200 rounded-lg mb-4 focus:ring-2 focus:ring-blue-400 outline-none"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      {loading ? (
        <p className="text-center text-gray-600">Searching...</p>
      ) : (
        <ul className="space-y-3">
          {results.length === 0 && searchTerm ? (
            <p className="text-center text-gray-500">No users found.</p>
          ) : (
            results.map((u) => (
              <li
                key={u.uid}
                className="p-3 border border-blue-100 rounded-xl flex justify-between items-center bg-white/90 shadow group"
              >
                <div>
                  <p className="font-semibold text-gray-800">{u.name}</p>
                  <p className="text-sm text-gray-500">{u.email}</p>
                </div>
                <div>
                  {alreadyFriends(u.uid) ? (
                    <p className="text-green-600 font-medium">
                      Already Friends
                    </p>
                  ) : alreadySent(u.uid) ? (
                    <p className="text-yellow-500 font-medium">Request Sent</p>
                  ) : requesting[u.uid] ? (
                    <button
                      disabled
                      className="px-3 py-1 bg-gray-300 text-gray-600 rounded-lg cursor-wait"
                    >
                      Sending...
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSendRequest(u.uid)}
                      className="px-4 py-1 bg-blue-600 text-white rounded-full font-semibold shadow hover:bg-blue-700 transition"
                    >
                      Add
                    </button>
                  )}
                </div>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};

export default AddFriend;
