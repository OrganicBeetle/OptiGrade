import React, { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import { courseMap } from "../utils/CourseMap";
import { useAuth } from "../context/AuthContext";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "../utils/firebase";
import { HiArrowLeft, HiHome } from "react-icons/hi";
import { useNavigate } from "react-router-dom";
import {
  HiCalendar,
  HiClock,
  HiAcademicCap,
  HiBookOpen,
  HiChartBar,
  HiCog,
  HiX,
  HiPlus,
  HiEye,
  HiPencil,
  HiTrash,
  HiFilter,
  HiSparkles,
} from "react-icons/hi";

// Extract subjects function
const extractSubjectsFromCourseMap = (branch, semester) => {
  if (!courseMap[branch] || !courseMap[branch][semester]) {
    return ["None", "Other"]; // fallback
  }

  const subjects = courseMap[branch][semester].map((course) => {
    // Extract course code (everything before the colon)
    const match = course.name.match(/^([A-Z]{2,4}[0-9]{3}[A-Z]?)/);
    return match ? match[1] : course.name.split(":")[0].trim();
  });
  return ["None", ...new Set(subjects), "Other"];
};

const TYPES = ["Exam", "Revision", "Project", "Study Block"];

const COLOR_OPTIONS = [
  { label: "Exam", color: "#ef4444", gradient: "from-red-400 to-red-600" },
  {
    label: "Revision",
    color: "#fbbf24",
    gradient: "from-amber-400 to-orange-500",
  },
  { label: "Project", color: "#3b82f6", gradient: "from-blue-400 to-blue-600" },
  {
    label: "Study Block",
    color: "#10b981",
    gradient: "from-emerald-400 to-emerald-600",
  },
  { label: "Other", color: "#6b7280", gradient: "from-gray-400 to-gray-600" },
];

function AcademicCalendar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [currentView, setCurrentView] = useState("dayGridMonth");
  const [activeFilter, setActiveFilter] = useState("My Calendar");
  const [calendarRef, setCalendarRef] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [deleteConfirmModalOpen, setDeleteConfirmModalOpen] = useState(false);

  // User data states
  const [userBranch, setUserBranch] = useState("");
  const [userSemester, setUserSemester] = useState(1);
  const [subjects, setSubjects] = useState(["None", "Other"]);

  // Form state
  const [form, setForm] = useState({
    type: TYPES[0],
    title: "",
    date: "",
    time: "",
    subject: "None",
    color: COLOR_OPTIONS[0].color,
    notes: "",
  });

  // Enhanced // Enhanced fetch function with better error handling and persistence
  const fetchUserDataAndEvents = async (forceRefresh = false) => {
    if (!user) return;

    // Only show loading on initial load, not on refresh
    if (!forceRefresh) setLoading(true);

    try {
      // Fetch user data
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const branch = userData.branch || "CSE";
        const semester = userData.semesterCount || 1;

        setUserBranch(branch);
        setUserSemester(semester + 1);

        const userSubjects = extractSubjectsFromCourseMap(branch, semester);
        setSubjects(userSubjects);

        setForm((prev) => ({
          ...prev,
          subject: "None",
        }));
      }

      // Fetch events for this user - FIXED QUERY
      const eventsQuery = query(
        collection(db, "examPlanner"),
        where("uid", "==", user.uid)
      );

      const eventsSnapshot = await getDocs(eventsQuery);
      const fetchedEvents = eventsSnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
        start: docSnap.data().start,
        allDay: docSnap.data().allDay || false,
      }));

      setEvents(fetchedEvents);
      console.log(`Fetched ${fetchedEvents.length} events from Firebase`);
    } catch (error) {
      console.error("Error fetching user data and events:", error);
      setSubjects(["None", "Other"]);
    } finally {
      if (!forceRefresh) setLoading(false);
    }
  };

  // Initial fetch and page visibility refetch
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Refetch data when page becomes visible again (user returns from dashboard)
      if (!document.hidden && user) {
        console.log("Page became visible, refetching events...");
        fetchUserDataAndEvents(true); // true = don't show loading spinner
      }
    };

    const handleFocus = () => {
      // Also refetch when window gains focus
      if (user) {
        console.log("Window gained focus, refetching events...");
        fetchUserDataAndEvents(true);
      }
    };

    // Initial fetch
    fetchUserDataAndEvents();

    // Add event listeners for page visibility and focus
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    // Cleanup
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [user]);

  // Auto-delete past events from both local state and Firebase
  useEffect(() => {
    const interval = setInterval(async () => {
      const now = new Date();
      const pastEvents = events.filter((event) => {
        const eventDate = new Date(event.start);
        return eventDate <= now;
      });

      if (pastEvents.length > 0) {
        try {
          // Delete past events from Firebase
          const deletePromises = pastEvents.map((event) =>
            deleteDoc(doc(db, "examPlanner", event.id))
          );
          await Promise.all(deletePromises);

          // Update local state
          setEvents((prevEvents) =>
            prevEvents.filter((event) => {
              const eventDate = new Date(event.start);
              return eventDate > now;
            })
          );

          console.log(`Deleted ${pastEvents.length} past events`);
        } catch (error) {
          console.error("Error deleting past events:", error);
        }
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [events, user]);

  // Update calendar view when currentView changes
  useEffect(() => {
    if (calendarRef) {
      const calendarApi = calendarRef.getApi();
      calendarApi.changeView(currentView);
    }
  }, [currentView, calendarRef]);

  // Handle date changes
  const handleDatesSet = (dateInfo) => {
    setCurrentDate(dateInfo.start);
  };

  // Filter events based on active filter
  const getFilteredEvents = () => {
    if (activeFilter === "My Calendar") {
      return events; // Show all events
    }

    const filterMap = {
      Exams: "Exam",
      Revision: "Revision",
      Projects: "Project",
      "Study Blocks": "Study Block",
    };

    const filterType = filterMap[activeFilter];
    if (!filterType) return events;

    return events.filter((event) => event.extendedProps?.type === filterType);
  };

  const filteredEvents = getFilteredEvents();

  // Enhanced calendar categories with better styling
  const calendarCategories = [
    {
      name: "My Calendar",
      color: "#3b82f6",
      count: events.length,
      icon: HiCalendar,
      gradient: "from-blue-400 to-blue-600",
    },
    {
      name: "Exams",
      color: "#ef4444",
      count: events.filter((e) => e.extendedProps?.type === "Exam").length,
      icon: HiAcademicCap,
      gradient: "from-red-400 to-red-600",
    },
    {
      name: "Revision",
      color: "#fbbf24",
      count: events.filter((e) => e.extendedProps?.type === "Revision").length,
      icon: HiBookOpen,
      gradient: "from-amber-400 to-orange-500",
    },
    {
      name: "Projects",
      color: "#10b981",
      count: events.filter((e) => e.extendedProps?.type === "Project").length,
      icon: HiChartBar,
      gradient: "from-emerald-400 to-emerald-600",
    },
    {
      name: "Study Blocks",
      color: "#f59e0b",
      count: events.filter((e) => e.extendedProps?.type === "Study Block")
        .length,
      icon: HiClock,
      gradient: "from-yellow-400 to-orange-500",
    },
  ];

  // Fixed handleDateClick function
  const handleDateClick = (arg) => {
    setForm((f) => ({
      ...f,
      date: arg.dateStr,
      color: COLOR_OPTIONS[0].color,
      type: TYPES[0],
      subject: "None",
      title: "",
      time: "",
      notes: "",
    }));
    setModalOpen(true);
  };

  // Handle event click for preview
  const handleEventClick = (clickInfo) => {
    setSelectedEvent(clickInfo.event);
    setPreviewModalOpen(true);
  };

  // Enhanced add event with immediate local update and Firebase sync
  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      alert("Please enter an event title");
      return;
    }

    setIsLoading(true);

    try {
      const newEventData = {
        title: form.title,
        start: form.date + (form.time ? `T${form.time}` : ""),
        allDay: !form.time,
        extendedProps: {
          subject: form.subject,
          color: form.color,
          notes: form.notes,
          type: form.type,
        },
        backgroundColor: form.color,
        borderColor: form.color,
        uid: user.uid,
        createdAt: Timestamp.now(),
      };

      // Add to Firebase first
      const docRef = await addDoc(collection(db, "examPlanner"), newEventData);

      // Add to local state with the Firebase-generated ID
      const newEvent = {
        id: docRef.id,
        ...newEventData,
      };

      // Update local state immediately
      setEvents((prevEvents) => [newEvent, ...prevEvents]);
      setModalOpen(false);

      // Reset form
      setForm({
        type: TYPES[0],
        title: "",
        date: "",
        time: "",
        subject: "None",
        color: COLOR_OPTIONS[0].color,
        notes: "",
      });

      console.log("Event added successfully and synced to Firebase!");
    } catch (error) {
      console.error("Error adding event:", error);
      alert("Failed to add event. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced delete event with immediate local update
  const handleDeleteEvent = async (eventId) => {
    try {
      // Remove from local state immediately for better UX
      setEvents((prevEvents) =>
        prevEvents.filter((event) => event.id !== eventId)
      );
      setPreviewModalOpen(false);

      // Delete from Firebase
      await deleteDoc(doc(db, "examPlanner", eventId));

      console.log("Event deleted successfully from Firebase!");
    } catch (error) {
      console.error("Error deleting event:", error);
      alert("Failed to delete event. Please try again.");
      // Refetch events to restore state if delete failed
      fetchUserDataAndEvents(true);
    }
  };

  // Manual refresh function
  const handleDeleteAllEvents = async () => {
    setDeletingAll(true);
    try {
      // Delete all events from Firebase
      const deletePromises = events.map((event) =>
        deleteDoc(doc(db, "examPlanner", event.id))
      );
      await Promise.all(deletePromises);

      // Clear local state
      setEvents([]);

      // Success toast
      const toast = document.createElement("div");
      toast.className =
        "fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg z-50 font-medium";
      toast.textContent = "✅ All events deleted successfully!";
      document.body.appendChild(toast);
      setTimeout(() => document.body.removeChild(toast), 3000);

      setDeleteConfirmModalOpen(false);
    } catch (error) {
      console.error("Error deleting all events:", error);

      // Error toast
      const toast = document.createElement("div");
      toast.className =
        "fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-xl shadow-lg z-50 font-medium";
      toast.textContent = "❌ Failed to delete events. Please try again.";
      document.body.appendChild(toast);
      setTimeout(() => document.body.removeChild(toast), 3000);
    } finally {
      setDeletingAll(false);
    }
  };

  // Change view
  const handleViewChange = (view) => {
    setCurrentView(view);
  };

  // Navigation functions with optimistic updates
  const handleTodayClick = () => {
    if (calendarRef) {
      const calendarApi = calendarRef.getApi();
      setCurrentDate(new Date());
      calendarApi.today();
      setTimeout(() => {
        const newDate = calendarApi.getDate();
        setCurrentDate(newDate);
      }, 0);
    }
  };

  const handlePrevClick = () => {
    if (calendarRef) {
      const calendarApi = calendarRef.getApi();
      const currentCalendarDate = calendarApi.getDate();
      const prevMonth = new Date(currentCalendarDate);
      prevMonth.setMonth(prevMonth.getMonth() - 1);
      setCurrentDate(prevMonth);
      calendarApi.prev();
      setTimeout(() => {
        const newDate = calendarApi.getDate();
        setCurrentDate(newDate);
      }, 0);
    }
  };

  const handleNextClick = () => {
    if (calendarRef) {
      const calendarApi = calendarRef.getApi();
      const currentCalendarDate = calendarApi.getDate();
      const nextMonth = new Date(currentCalendarDate);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      setCurrentDate(nextMonth);
      calendarApi.next();
      setTimeout(() => {
        const newDate = calendarApi.getDate();
        setCurrentDate(nextMonth);
      }, 0);
    }
  };

  // Enhanced event rendering
  const renderEventContent = (eventInfo) => (
    <div className="flex items-center gap-1 text-xs p-1.5 cursor-pointer hover:scale-105 transition-transform duration-200">
      <span
        className="inline-block w-2 h-2 rounded-full flex-shrink-0 shadow-sm"
        style={{ background: eventInfo.event.extendedProps.color }}
      />
      <span className="font-medium overflow-hidden text-ellipsis whitespace-nowrap">
        {eventInfo.event.title}
      </span>
    </div>
  );

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading your calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="font-inter bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 min-h-screen max-h-screen overflow-hidden flex">
      {/* Enhanced Sidebar */}
      <div className="w-70 bg-white/90 backdrop-blur-xl border-r border-white/30 py-4 flex flex-col shadow-2xl">
        {/* Sidebar Header */}
        <div className="px-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl">
              <HiCalendar className="text-white text-lg" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">
                Academic Calendar
              </h2>
              <p className="text-xs text-slate-500">Manage your schedule</p>
            </div>
          </div>
        </div>

        {/* Enhanced View Toggle */}
        <div className="px-6 mb-4">
          <div className="flex bg-gradient-to-r from-slate-100 to-slate-200 rounded-2xl p-1.5 backdrop-blur-sm shadow-inner">
            {[
              { label: "Day", value: "timeGridDay" },
              { label: "Week", value: "timeGridWeek" },
              { label: "Month", value: "dayGridMonth" },
            ].map((view) => (
              <button
                key={view.label}
                onClick={() => handleViewChange(view.value)}
                className={`flex-1 px-2 py-1.5 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-300 ${
                  currentView === view.value
                    ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg transform scale-105"
                    : "text-slate-600 hover:text-slate-800 hover:bg-white/50"
                }`}
              >
                {view.label}
              </button>
            ))}
          </div>
        </div>

        {/* Enhanced Add Event Button */}
        <div className="px-6 mb-6">
          <button
            onClick={() => setModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 text-white rounded-2xl font-bold shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
          >
            <HiPlus
              size={14}
              className="group-hover:rotate-90 transition-transform duration-300"
            />
            <span>Add Event</span>
            <HiSparkles size={12} className="opacity-70" />
          </button>
        </div>

        {/* Enhanced My Calendars */}
        <div className="px-6 mb-4 flex-1 overflow-y-auto">
          <div className="flex items-center gap-2 mb-3">
            <HiFilter className="text-slate-600" size={14} />
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
              My Calendars
            </h3>
          </div>

          {/* Enhanced Filter Indicator */}
          <div className="mb-3 p-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-600">Showing:</span>
              <span className="font-bold text-blue-700">{activeFilter}</span>
              {activeFilter !== "My Calendar" && (
                <button
                  onClick={() => setActiveFilter("My Calendar")}
                  className="ml-auto text-xs text-blue-600 hover:text-blue-800 underline cursor-pointer font-medium"
                >
                  Show All
                </button>
              )}
            </div>
          </div>

          {calendarCategories.map((cal) => {
            const IconComponent = cal.icon;
            return (
              <div
                key={cal.name}
                onClick={() => setActiveFilter(cal.name)}
                className={`flex items-center justify-between p-2 rounded-xl cursor-pointer mb-1.5 transition-all duration-300 group ${
                  activeFilter === cal.name
                    ? `bg-gradient-to-r ${cal.gradient} text-white shadow-lg transform scale-105`
                    : "hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:shadow-md"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`p-1 rounded-lg ${
                      activeFilter === cal.name
                        ? "bg-white/20"
                        : "bg-gradient-to-r " + cal.gradient
                    }`}
                  >
                    <IconComponent
                      size={12}
                      className={
                        activeFilter === cal.name ? "text-white" : "text-white"
                      }
                    />
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      activeFilter === cal.name
                        ? "text-white"
                        : "text-slate-700 group-hover:text-slate-800"
                    }`}
                  >
                    {cal.name}
                  </span>
                </div>
                <div
                  className={`px-1.5 py-0.5 rounded-full text-lg font-bold ${
                    activeFilter === cal.name
                      ? "bg-white/20 text-white"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {cal.count}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Enhanced Main Content */}
      <div className="flex-1 p-4 lg:p-6 flex flex-col overflow-hidden">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate("/dashboard")}
            className="group flex items-center gap-2 px-3 py-1.5 text-slate-600 hover:text-blue-600 bg-white/60 hover:bg-blue-50 rounded-xl border border-slate-200 hover:border-blue-200 transition-all duration-200 cursor-pointer"
          >
            <HiHome
              size={14}
              className="group-hover:scale-110 transition-transform duration-200"
            />
            <span className="text-sm font-medium">Dashboard</span>
          </button>
          <span className="text-slate-400 text-lg">›</span>
          <span className="text-slate-800 font-semibold text-sm bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">
            Academic Calendar
          </span>
        </div>

        {/* Enhanced Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-1">
              {currentDate.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </h1>
            <p className="text-sm text-slate-600 flex items-center gap-2">
              <HiCalendar size={14} />
              Today is{" "}
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevClick}
              className="px-3 py-2 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl text-slate-700 text-sm font-medium hover:bg-white hover:shadow-lg transition-all duration-300 cursor-pointer"
            >
              ‹ Prev
            </button>
            <button
              onClick={handleTodayClick}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl text-sm font-semibold hover:shadow-lg transition-all duration-300 cursor-pointer"
            >
              Today
            </button>
            <button
              onClick={handleNextClick}
              className="px-3 py-2 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl text-slate-700 text-sm font-medium hover:bg-white hover:shadow-lg transition-all duration-300 cursor-pointer"
            >
              Next ›
            </button>
            {/* Manual Refresh Button */}
            <button
              onClick={() => setDeleteConfirmModalOpen(true)}
              disabled={events.length === 0}
              className={`px-3 py-2 backdrop-blur-sm border rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer ${
                events.length === 0
                  ? "bg-gray-500/10 border-gray-200 text-gray-500 cursor-not-allowed"
                  : "bg-red-500/10 border-red-200 text-red-700 hover:bg-red-500/20"
              }`}
              title={
                events.length === 0
                  ? "No events to delete"
                  : "Delete All Events"
              }
            >
              🗑️
            </button>
          </div>
        </div>

        {/* Enhanced Calendar - Smaller Size */}
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/50 flex-1 min-h-0">
          <FullCalendar
            ref={setCalendarRef}
            plugins={[
              dayGridPlugin,
              timeGridPlugin,
              listPlugin,
              interactionPlugin,
            ]}
            initialView={currentView}
            headerToolbar={false}
            height="100%"
            events={filteredEvents}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            eventContent={renderEventContent}
            selectable={true}
            dayMaxEvents={3}
            moreLinkClick="popover"
            datesSet={handleDatesSet}
            editable={false}
            eventStartEditable={false}
            eventResizableFromStart={false}
            eventDurationEditable={false}
          />
        </div>
      </div>

      {/* Rest of your modals remain the same... */}
      {deleteConfirmModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-5">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-white/30">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500 rounded-xl">
                  <HiTrash className="text-white text-lg" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">
                  Delete All Events
                </h3>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <HiTrash className="text-red-500 text-2xl" />
                </div>
                <h4 className="text-lg font-bold text-slate-800 mb-2">
                  Are you absolutely sure?
                </h4>
                <p className="text-slate-600 text-sm leading-relaxed">
                  This will permanently delete{" "}
                  <strong>all {events.length} events</strong> from your
                  calendar. This action cannot be undone.
                </p>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteConfirmModalOpen(false)}
                  disabled={deletingAll}
                  className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    deletingAll
                      ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAllEvents}
                  disabled={deletingAll}
                  className={`px-6 py-3 rounded-xl text-sm font-bold shadow-lg transition-all duration-200 flex items-center gap-2 ${
                    deletingAll
                      ? "bg-slate-400 cursor-not-allowed"
                      : "bg-red-500 hover:bg-red-600 text-white hover:shadow-xl cursor-pointer"
                  }`}
                >
                  {deletingAll ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                        />
                      </svg>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <HiTrash size={16} />
                      Delete All Events
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Enhanced Add Event Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-5">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-2xl max-h-screen overflow-y-auto border border-white/30">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl">
                  <HiPlus className="text-white text-lg" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">
                  Create New Event
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                disabled={isLoading}
                className={`p-2.5 rounded-xl transition-all duration-200 cursor-pointer ${
                  isLoading
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800"
                }`}
              >
                <HiX size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <form onSubmit={handleAddEvent} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Left Column */}
                <div className="space-y-5">
                  {/* Event Title */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Event Title *
                    </label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, title: e.target.value }))
                      }
                      required
                      disabled={isLoading}
                      placeholder="e.g., DSA Midsem Exam"
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none bg-white/80 backdrop-blur-sm transition-all duration-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-400/20 focus:bg-white disabled:bg-slate-100 disabled:text-slate-500"
                    />
                  </div>

                  {/* Event Type */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Event Type
                    </label>
                    <select
                      value={form.type}
                      onChange={(e) => {
                        const selectedType = e.target.value;
                        setForm((f) => ({
                          ...f,
                          type: selectedType,
                          color:
                            COLOR_OPTIONS.find((c) => c.label === selectedType)
                              ?.color || f.color,
                        }));
                      }}
                      disabled={isLoading}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none bg-white/80 backdrop-blur-sm cursor-pointer disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                    >
                      {TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Subject (Optional)
                    </label>
                    <select
                      value={form.subject}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, subject: e.target.value }))
                      }
                      disabled={isLoading}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none bg-white/80 backdrop-blur-sm cursor-pointer disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                    >
                      {subjects.map((subj) => (
                        <option key={subj} value={subj}>
                          {subj}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-5">
                  {/* Date */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Date *
                    </label>
                    <input
                      type="date"
                      value={form.date}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, date: e.target.value }))
                      }
                      required
                      disabled={isLoading}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none bg-white/80 backdrop-blur-sm disabled:bg-slate-100 disabled:text-slate-500"
                    />
                  </div>

                  {/* Time */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Time (Optional)
                    </label>
                    <input
                      type="time"
                      value={form.time}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, time: e.target.value }))
                      }
                      disabled={isLoading}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none bg-white/80 backdrop-blur-sm disabled:bg-slate-100 disabled:text-slate-500"
                    />
                  </div>

                  {/* Color Label */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-3">
                      Color Theme
                    </label>
                    <div className="flex gap-3 flex-wrap">
                      {COLOR_OPTIONS.map((opt) => (
                        <button
                          key={opt.label}
                          type="button"
                          onClick={() =>
                            setForm((f) => ({ ...f, color: opt.color }))
                          }
                          disabled={isLoading}
                          className={`relative w-10 h-10 rounded-xl cursor-pointer outline-none transition-all duration-300 transform hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50 ${
                            form.color === opt.color
                              ? "ring-4 ring-slate-800 shadow-xl scale-110"
                              : "ring-2 ring-white/50 hover:ring-slate-300"
                          }`}
                          style={{
                            background: `linear-gradient(135deg, ${opt.color}, ${opt.color}dd)`,
                          }}
                        >
                          {form.color === opt.color && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-3 h-3 bg-white rounded-full shadow-sm"></div>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="mb-8">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  rows={3}
                  disabled={isLoading}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none resize-none bg-white/80 backdrop-blur-sm transition-all duration-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-400/20 disabled:bg-slate-100 disabled:text-slate-500"
                  placeholder="Add any additional notes or details..."
                />
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-4 pt-6 border-t border-slate-200/50">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={isLoading}
                  className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    isLoading
                      ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`px-8 py-3 rounded-xl text-sm font-bold shadow-lg transition-all duration-200 flex items-center gap-2 ${
                    isLoading
                      ? "bg-slate-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:shadow-xl cursor-pointer"
                  }`}
                >
                  {isLoading ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                        />
                      </svg>
                      Creating...
                    </>
                  ) : (
                    "Create Event"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Event Preview Modal */}
      {previewModalOpen && selectedEvent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-5">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-white/30">
            {/* Preview Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200/50">
              <div className="flex items-center gap-3">
                <div
                  className="w-5 h-5 rounded-lg shadow-sm"
                  style={{ background: selectedEvent.backgroundColor }}
                />
                <h3 className="text-xl font-bold text-slate-800">
                  Event Details
                </h3>
              </div>
              <button
                onClick={() => setPreviewModalOpen(false)}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 hover:text-slate-800 transition-all duration-200 cursor-pointer"
              >
                <HiX size={20} />
              </button>
            </div>

            {/* Preview Content */}
            <div className="p-6">
              <div className="mb-6">
                <h4 className="text-2xl font-bold text-slate-800 mb-3">
                  {selectedEvent.title}
                </h4>
                <div
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-white text-sm font-semibold shadow-lg"
                  style={{
                    background: `linear-gradient(135deg, ${selectedEvent.backgroundColor}, ${selectedEvent.backgroundColor}dd)`,
                  }}
                >
                  <HiSparkles size={14} />
                  {selectedEvent.extendedProps.type}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl">
                  <HiCalendar size={20} className="text-slate-500" />
                  <span className="text-slate-700 font-medium">
                    {new Date(selectedEvent.start).toLocaleDateString()}
                  </span>
                </div>

                {selectedEvent.extendedProps.subject &&
                  selectedEvent.extendedProps.subject !== "None" && (
                    <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl">
                      <HiBookOpen size={20} className="text-slate-500" />
                      <span className="text-slate-700 font-medium">
                        {selectedEvent.extendedProps.subject}
                      </span>
                    </div>
                  )}

                {!selectedEvent.allDay && (
                  <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl">
                    <HiClock size={20} className="text-slate-500" />
                    <span className="text-slate-700 font-medium">
                      {new Date(selectedEvent.start).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                )}

                {selectedEvent.extendedProps.notes && (
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <h5 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                      <HiEye size={16} />
                      Notes
                    </h5>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {selectedEvent.extendedProps.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Preview Footer */}
              <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-slate-200/50">
                <button
                  onClick={() => handleDeleteEvent(selectedEvent.id)}
                  className="flex items-center gap-2 px-5 py-3 border-2 border-red-200 hover:border-red-300 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-sm font-semibold transition-all duration-200 cursor-pointer"
                >
                  <HiTrash size={16} />
                  Delete Event
                </button>
                <button
                  onClick={() => setPreviewModalOpen(false)}
                  className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AcademicCalendar;
