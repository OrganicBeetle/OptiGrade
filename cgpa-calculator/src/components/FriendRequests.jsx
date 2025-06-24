import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../utils/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  arrayRemove,
  arrayUnion,
} from "firebase/firestore";
import { toast } from "react-toastify";
import { FiUserCheck, FiUserX, FiUser } from "react-icons/fi";

const FriendRequests = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [processingType, setProcessingType] = useState(""); // "accept" or "reject"

  useEffect(() => {
    if (!user) return;

    const fetchRequests = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const incoming = userDoc.data()?.friendRequests?.incoming || [];
        const requestProfiles = [];

        for (const senderId of incoming) {
          const senderDoc = await getDoc(doc(db, "users", senderId));
          if (senderDoc.exists()) {
            requestProfiles.push({ uid: senderId, ...senderDoc.data() });
          }
        }

        setRequests(requestProfiles);
      } catch (err) {
        console.error("Failed to fetch requests", err);
        toast.error("Failed to load requests");
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [user]);

  const handleAccept = async (senderId) => {
    setProcessingId(senderId);
    setProcessingType("accept");
    try {
      await updateDoc(doc(db, "users", user.uid), {
        friends: arrayUnion(senderId),
        "friendRequests.incoming": arrayRemove(senderId),
      });
      await updateDoc(doc(db, "users", senderId), {
        friends: arrayUnion(user.uid),
        "friendRequests.outgoing": arrayRemove(user.uid),
      });

      toast.success("Friend request accepted");
      setRequests((prev) => prev.filter((r) => r.uid !== senderId));
    } catch (err) {
      console.error("Accept failed", err);
      toast.error("Failed to accept request");
    } finally {
      setProcessingId(null);
      setProcessingType("");
    }
  };

  const handleReject = async (senderId) => {
    setProcessingId(senderId);
    setProcessingType("reject");
    try {
      await updateDoc(doc(db, "users", user.uid), {
        "friendRequests.incoming": arrayRemove(senderId),
      });
      await updateDoc(doc(db, "users", senderId), {
        "friendRequests.outgoing": arrayRemove(user.uid),
      });

      toast.success("Friend request rejected");
      setRequests((prev) => prev.filter((r) => r.uid !== senderId));
    } catch (err) {
      console.error("Reject failed", err);
      toast.error("Failed to reject request");
    } finally {
      setProcessingId(null);
      setProcessingType("");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white/80 backdrop-blur rounded-2xl shadow-xl mt-8">
      <div className="flex items-center gap-2 mb-4">
        <FiUser className="text-blue-600 text-2xl" />
        <h2 className="text-2xl font-semibold text-blue-700">
          Incoming Friend Requests
        </h2>
      </div>
      {requests.length === 0 ? (
        <p className="text-gray-600 text-center">No pending requests.</p>
      ) : (
        <ul className="space-y-4">
          {requests.map((r) => (
            <li
              key={r.uid}
              className="flex justify-between items-center p-4 bg-white/90 shadow rounded-xl border border-blue-100"
            >
              <div className="flex items-center gap-3">
                {r.photoURL && r.photoURL.trim() !== "" ? (
                  <img
                    src={r.photoURL}
                    alt={r.name}
                    className="w-10 h-10 rounded-full object-cover border-2 border-blue-200 shadow"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                ) : (
                  <span className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold text-lg border-2 border-blue-200 shadow">
                    {r.name?.charAt(0).toUpperCase() || "U"}
                  </span>
                )}
                <div>
                  <p className="font-medium text-gray-800">{r.name}</p>
                  <p className="text-sm text-gray-500">{r.email}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleAccept(r.uid)}
                  disabled={processingId === r.uid}
                  className="flex items-center gap-1 px-4 py-1 text-sm bg-green-500 text-white rounded-full font-semibold shadow hover:bg-green-600 transition min-w-[90px]"
                >
                  {processingId === r.uid && processingType === "accept" ? (
                    <span className="flex items-center gap-1">
                      <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                      Accepting...
                    </span>
                  ) : (
                    <>
                      <FiUserCheck /> Accept
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleReject(r.uid)}
                  disabled={processingId === r.uid}
                  className="flex items-center gap-1 px-4 py-1 text-sm bg-red-500 text-white rounded-full font-semibold shadow hover:bg-red-600 transition min-w-[90px]"
                >
                  {processingId === r.uid && processingType === "reject" ? (
                    <span className="flex items-center gap-1">
                      <span className="cursor-pointer animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                      Rejecting...
                    </span>
                  ) : (
                    <>
                      <FiUserX /> Reject
                    </>
                  )}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default FriendRequests;
