import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../utils/firebase";
import { useAuth } from "../context/AuthContext";
import { FiArrowLeft } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

const branchOptions = [
  { value: "", label: "All Branches" },
  { value: "CER", label: "Ceramic Engineering" },
  { value: "CHE", label: "Chemical Engineering" },
  { value: "CSE", label: "Computer Science and Engineering" },
  { value: "CIV", label: "Civil Engineering" },
  { value: "MET", label: "Metallurgical Engineering" },
  { value: "MEC", label: "Mechanical Engineering" },
  { value: "ECE", label: "Electronics and Communication Engineering" },
  { value: "EEE", label: "Electrical and Electronics Engineering" },
  { value: "PHE", label: "Pharmaceutical Engineering" },
  { value: "MIN", label: "Mining Engineering" },
];

const Leaderboard = () => {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!user) return;

      try {
        const mySnap = await getDoc(doc(db, "users", user.uid));
        const myYear = mySnap.data()?.year;
        if (!myYear) return;

        // Get current year
        const currentYear = new Date().getFullYear();

        // Fetch all public users
        const q = query(collection(db, "users"), where("isPublic", "==", true));
        const snapshot = await getDocs(q);

        const results = await Promise.all(
          snapshot.docs.map(async (docSnap) => {
            const data = docSnap.data();

            // Only include if semesterCount matches (currentYear - user.year) * 2
            const expectedSemesterCount = (currentYear - data.year) * 2;
            if (data.semesterCount !== expectedSemesterCount) return null;

            if (data.year !== myYear) return null;

            const semSnap = await getDocs(
              collection(db, "semesters", docSnap.id, "data")
            );
            const sems = semSnap.docs.map((d) => d.data());

            const totalCredits = sems.reduce(
              (acc, s) =>
                acc + (s.courses?.reduce((a, c) => a + c.credits, 0) || 0),
              0
            );
            const totalPoints = sems.reduce((acc, s) => {
              const spi = parseFloat(s.spi);
              const credits =
                s.courses?.reduce((a, c) => a + c.credits, 0) || 0;
              return acc + spi * credits;
            }, 0);

            const cpi = totalCredits ? totalPoints / totalCredits : 0;

            return {
              id: docSnap.id,
              name: data.name,
              branch: data.branch || "",
              cpi: parseFloat(cpi.toFixed(2)),
              photoURL: data.photoURL || "",
            };
          })
        );

        const filtered = results.filter((r) => r && !isNaN(r.cpi));
        setLeaderboard(filtered);
      } catch (err) {
        console.error("Error fetching leaderboard:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [user]);

  // Filter and sort leaderboard based on search and branch, then assign ranks
  const filteredLeaderboardRaw = leaderboard.filter((u) => {
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase());
    const matchesBranch = branch ? u.branch === branch : true;
    return matchesSearch && matchesBranch;
  });

  // Sort by CPI descending
  const filteredSorted = [...filteredLeaderboardRaw].sort(
    (a, b) => b.cpi - a.cpi
  );

  // Assign ranks within the filtered (and sorted) array
  const filteredLeaderboard = filteredSorted.map((u, i) => ({
    ...u,
    rank: i + 1,
  }));

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500 border-solid"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 py-10 px-2">
      <div className="max-w-4xl mx-auto">
        {/* Back to Dashboard Button */}
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate("/dashboard")}
            className="cursor-pointer flex items-center gap-2 px-4 py-2 rounded-full bg-white/70 hover:bg-blue-100 text-blue-700 font-medium shadow transition focus:outline-none focus:ring-2 focus:ring-blue-400 backdrop-blur"
            aria-label="Back to Dashboard"
          >
            <FiArrowLeft className="text-xl" />
            <span className="hidden sm:inline">Back to Dashboard</span>
          </button>
        </div>
        {/* Hero Section */}
        <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-2xl px-8 py-8 mb-8 border border-blue-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h2 className="text-2xl md:text-3xl font-bold text-blue-700 flex-shrink-0 tracking-tight drop-shadow-sm">
            🏆 Leaderboard
          </h2>
          <div className="flex flex-col md:flex-row md:items-center gap-3 w-full md:w-auto">
            {/* Branch Filter */}
            <select
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 transition w-full md:w-48"
            >
              {branchOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {/* Search Bar */}
            <input
              type="text"
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 transition w-full md:w-64"
            />
          </div>
        </div>
        {/* Leaderboard Table */}
        <div className="relative overflow-x-auto">
          <div className="bg-white/60 backdrop-blur-xl rounded-2xl shadow-xl border border-blue-100">
            <table className="w-full table-auto">
              <thead>
                <tr className="text-gray-600 text-left border-b">
                  <th className="py-4 px-3 text-lg font-semibold">Rank</th>
                  <th className="py-4 px-3 text-lg font-semibold">Name</th>
                  <th className="py-4 px-3 text-lg font-semibold">CPI</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeaderboard.map(
                  ({ rank, name, cpi, id, photoURL }) => {
                    const isCurrentUser = user && user.uid === id;

                    // Border color for top 3 ranks
                    let borderColor = "";
                    if (rank === 1)
                      borderColor = "border-[3px] border-[#F0D475]"; // Gold
                    else if (rank === 2)
                      borderColor = "border-[3px] border-[#BFC6D1]"; // Silver
                    else if (rank === 3)
                      borderColor = "border-[3px] border-[#E9B17A]"; // Bronze
                    else borderColor = "border-transparent";

                    // Fallback avatar (blue circle with initial)
                    const fallbackAvatar = (
                      <span
                        className={`w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg shadow ${borderColor}`}
                      >
                        {name[0].toUpperCase()}
                      </span>
                    );

                    return (
                      <tr key={id} className="border-b transition group">
                        <td className="py-3 px-3 font-bold">
                          <span className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-extrabold text-blue-700">
                            {rank}
                          </span>
                        </td>
                        <td className="py-3 px-3 flex items-center gap-3 font-medium text-gray-800">
                          {photoURL && !photoURL.includes("default") ? (
                            <img
                              src={photoURL}
                              alt={name}
                              className={`w-9 h-9 rounded-full object-cover shadow ${borderColor}`}
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.style.display = "none";
                                e.target.parentNode.appendChild(fallbackAvatar);
                              }}
                            />
                          ) : (
                            fallbackAvatar
                          )}
                          <span>{name}</span>
                          {isCurrentUser && (
                            <span className="ml-2 px-2 py-0.5 rounded bg-blue-100 text-xs text-blue-700 font-semibold">
                              You
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-blue-700 font-semibold text-lg">
                          {cpi}
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
