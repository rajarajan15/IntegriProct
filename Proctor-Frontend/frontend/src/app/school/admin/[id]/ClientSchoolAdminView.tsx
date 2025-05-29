"use client";

import CohortCard from "@/components/CohortCard";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import CourseCard from "@/components/CourseCard";
import CreateCohortDialog from "@/components/CreateCohortDialog";
import CreateCourseDialog from '@/components/CreateCourseDialog';
import InviteMembersDialog from "@/components/InviteMembersDialog";
import { Header } from "@/components/layout/header";
import Toast from "@/components/Toast";
import { Cohort, Course, TeamMember } from "@/types";
import { BookOpen, Building, ExternalLink, Layers, Trash2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bar, Pie    } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);


interface ProctorLog {
    userId: string;
    moduleId: string;
    voiceDetectionCount: number;
    tabSwitchCount: number;
    copyCount: number;
    pasteCount: number;
    cheatingScore: number;
    submitted: boolean;
}


interface School {
    id: number;
    name: string;
    url: string;
    courses: Course[];
    cohorts: Cohort[];
    members: TeamMember[];
}

type TabType = 'courses' | 'cohorts' | 'members' | 'proctors';

export default function ClientSchoolAdminView({ id }: { id: string }) {
    const router = useRouter();
    const [school, setSchool] = useState<School | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('courses');
    const [isEditingName, setIsEditingName] = useState(false);
    const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [isCreateCohortDialogOpen, setIsCreateCohortDialogOpen] = useState(false);
    const [isCreateCourseDialogOpen, setIsCreateCourseDialogOpen] = useState(false);
    const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null);
    const schoolNameRef = useRef<HTMLHeadingElement>(null);


    const [proctorLogs, setProctorLogs] = useState<ProctorLog[]>([]);

    const [error, setError] = useState<string>("");
    // Add state for toast notifications
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState({
        title: '',
        description: '',
        emoji: ''
    });

    // Add useEffect to automatically hide toast after 5 seconds
    useEffect(() => {
        if (showToast) {
            const timer = setTimeout(() => {
                setShowToast(false);
            }, 5000);

            // Cleanup the timer when component unmounts or showToast changes
            return () => clearTimeout(timer);
        }
    }, [showToast]);

    // Initialize tab from URL hash
    useEffect(() => {
        // Check if there's a hash in the URL
        const hash = window.location.hash.replace('#', '');
        if (hash === 'cohorts' || hash === 'members' || hash === 'courses' || hash === 'proctors') {
            setActiveTab(hash as TabType);
        }
    }, []);

    // Fetch school data
    useEffect(() => {
        const fetchSchool = async () => {
            setLoading(true);
            try {
                // Fetch basic school info
                const schoolResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/organizations/${id}`);
                if (!schoolResponse.ok) {
                    throw new Error(`API error: ${schoolResponse.status}`);
                }
                const schoolData = await schoolResponse.json();

                // Fetch members separately
                const membersResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/organizations/${id}/members`);
                if (!membersResponse.ok) {
                    throw new Error(`API error: ${membersResponse.status}`);
                }
                const membersData = await membersResponse.json();

                // Fetch cohorts separately
                const cohortsResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/cohorts/?org_id=${id}`);
                if (!cohortsResponse.ok) {
                    throw new Error(`API error: ${cohortsResponse.status}`);
                }
                const cohortsData = await cohortsResponse.json();

                // Fetch courses separately
                const coursesResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/courses/?org_id=${id}`);
                if (!coursesResponse.ok) {
                    throw new Error(`API error: ${coursesResponse.status}`);
                }
                const coursesData = await coursesResponse.json();

                // Transform the API response to match the School interface
                const transformedSchool: School = {
                    id: parseInt(schoolData.id),
                    name: schoolData.name,
                    url: `${process.env.NEXT_PUBLIC_APP_URL}/school/${schoolData.slug}`,
                    courses: coursesData.map((course: any) => ({
                        id: course.id,
                        name: course.name,
                        moduleCount: 0, // Default value since API doesn't provide this
                        description: '' // Default value since API doesn't provide this
                    })),
                    cohorts: cohortsData.map((cohort: any) => ({
                        id: cohort.id,
                        name: cohort.name,
                    })),
                    members: membersData || []  // Use the members from the separate endpoint
                };

                setSchool(transformedSchool);
                setLoading(false);
            } catch (error) {
                console.error("Error fetching school:", error);
                setLoading(false);
            }
        };

        fetchSchool();
    }, [id, router]);

    // Handle clicking outside the name edit field
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (isEditingName && schoolNameRef.current && !schoolNameRef.current.contains(event.target as Node)) {
                setIsEditingName(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isEditingName, schoolNameRef]);

    // Toggle name editing
    const toggleNameEdit = () => {
        setIsEditingName(!isEditingName);
        // Focus the name field when editing is enabled
        if (!isEditingName) {
            setTimeout(() => {
                if (schoolNameRef.current) {
                    schoolNameRef.current.focus();
                    // Place cursor at the end of the text
                    const range = document.createRange();
                    const selection = window.getSelection();
                    range.selectNodeContents(schoolNameRef.current);
                    range.collapse(false);
                    selection?.removeAllRanges();
                    selection?.addRange(range);
                }
            }, 0);
        }
    };

    useEffect(() => {
        const fetchProctorLogs = async () => {
            try {
                const response = await fetch('http://localhost:5000/get_all_proctor_logs'); // Update this URL if needed
                const data = await response.json();

                // Filter for logs where submitted is true
                const submittedLogs = data.filter((log: ProctorLog) => log.submitted === true);
                setProctorLogs(submittedLogs);
                setLoading(false);
            } catch (err) {
                setError('Failed to fetch proctor logs.');
                setLoading(false);
            }
        };

        fetchProctorLogs();
    }, []);

    // Calculate the cheating score based on logs
    const calculateCheatingScore = (log: ProctorLog) => {
        let score = 0;
        score += log.voiceDetectionCount > 2 ? 10 : 0;
        score += log.tabSwitchCount > 5 ? 15 : 0;
        score += log.copyCount > 0 ? 20 : 0;
        score += log.pasteCount > 0 ? 10 : 0;
        return score;
    };

    const maxScore = 55; 

    const getChartData = (proctorLogs: ProctorLog[]) => {
        const labels = proctorLogs.map(log => log.userId);
        const voiceDetectionData = proctorLogs.map(log => log.voiceDetectionCount);
        const tabSwitchData = proctorLogs.map(log => log.tabSwitchCount);
        const copyData = proctorLogs.map(log => log.copyCount);
        const pasteData = proctorLogs.map(log => log.pasteCount);

        return {
            labels,
            datasets: [
                {
                    label: "Audio Score",
                    data: voiceDetectionData,
                    backgroundColor: "rgba(59, 130, 246, 0.5)", // Blue
                },
                {
                    label: "Switch Score",
                    data: tabSwitchData,
                    backgroundColor: "rgba(255, 165, 0, 0.5)", // Amber
                },
                {
                    label: "Copy Score",
                    data: copyData,
                    backgroundColor: "rgba(255, 99, 132, 0.5)", // Red
                },
                {
                    label: "Paste Score",
                    data: pasteData,
                    backgroundColor: "rgba(75, 192, 192, 0.5)", // Green
                },
            ],
        };
    };

    const chartData = getChartData(proctorLogs);
    // Use effect to fetch logs on mount
    

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    const totalCheatingScore = proctorLogs.reduce((acc, log) => acc + calculateCheatingScore(log), 0);
    const cheatingPercentage = (totalCheatingScore / (maxScore * proctorLogs.length)) * 100;

    // Pie chart data
    const pieChartData = {
        labels: ["Attained Cheating Score", "Remaining Score"],
        datasets: [
            {
                data: [totalCheatingScore, maxScore * proctorLogs.length - totalCheatingScore],
                backgroundColor: ["#4CAF50", "#F44336"],
            },
        ],
    };

    // Handle name blur
    const handleNameBlur = () => {
        setIsEditingName(false);
        // In a real app, you would save the name change here
        console.log("School name updated:", schoolNameRef.current?.textContent);
    };

    // Handle keyboard events for name editing
    const handleNameKeyDown = (e: React.KeyboardEvent<HTMLHeadingElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            setIsEditingName(false);
            // In a real app, you would save the name change here
            console.log("School name updated:", schoolNameRef.current?.textContent);
        }
    };

    const handleInviteMembers = async (emails: string[]) => {
        try {
            // Make API call to invite members
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/organizations/${id}/members`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ emails }),
            });

            if (!response.ok) {
                throw new Error('Failed to invite members');
            }

            // Refresh school data to get updated members list
            const membersResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/organizations/${id}/members`);
            if (!membersResponse.ok) {
                throw new Error('Failed to fetch updated members');
            }
            const membersData = await membersResponse.json();

            // Update school state with new members
            setSchool(prev => prev ? {
                ...prev,
                members: membersData
            } : null);

            // Close the invite dialog
            setIsInviteDialogOpen(false);

            // Show toast notification
            setToastMessage({
                title: 'Growing the tribe',
                description: `${emails.length} ${emails.length === 1 ? 'member' : 'members'} has been invited to your team`,
                emoji: '🎉'
            });
            setShowToast(true);

        } catch (error) {
            console.error('Error inviting members:', error);
            // Here you would typically show an error message to the user
        }
    };

    const handleDeleteMember = (member: TeamMember) => {
        setMemberToDelete(member);
        setIsDeleteConfirmOpen(true);
    };

    const confirmDeleteMember = async () => {
        if (!memberToDelete) return;

        try {
            // Make API call to delete member
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/organizations/${id}/members`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_ids: [memberToDelete.id]
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to delete member');
            }

            // Refresh school data to get updated members list
            const membersResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/organizations/${id}/members`);
            if (!membersResponse.ok) {
                throw new Error('Failed to fetch updated members');
            }
            const membersData = await membersResponse.json();

            // Update school state with new members
            setSchool(prev => prev ? {
                ...prev,
                members: membersData
            } : null);

            // Show toast notification for successful deletion
            setToastMessage({
                title: 'Member removed',
                description: `${memberToDelete.email} has been removed from your team`,
                emoji: '✓'
            });
            setShowToast(true);

        } catch (error) {
            console.error('Error deleting member:', error);
            // Here you would typically show an error message to the user
        } finally {
            setIsDeleteConfirmOpen(false);
            setMemberToDelete(null);
        }
    };

    const handleCreateCohort = async (cohort: any) => {
        try {
            console.log("Cohort created:", cohort);

            // Important: Navigate before closing the dialog to prevent flash of school page
            // This navigation will unmount the current component, which implicitly closes the dialog
            if (cohort && cohort.id) {
                console.log("Navigating to:", `/school/admin/${id}/cohorts/${cohort.id}`);
                router.push(`/school/admin/${id}/cohorts/${cohort.id}`);
            } else {
                console.error("Cohort ID is missing in the response:", cohort);
                // Fallback to schools page if ID is missing and close dialog
                setIsCreateCohortDialogOpen(false);
                router.push(`/school/admin/${id}#cohorts`);
            }
        } catch (error) {
            console.error('Error handling cohort creation:', error);
            setIsCreateCohortDialogOpen(false);
        }
    };

    // Handle course creation success
    const handleCourseCreationSuccess = (courseData: { id: string; name: string }) => {
        // Redirect to the new course page - dialog will be unmounted during navigation
        router.push(`/school/admin/${id}/courses/${courseData.id}`);
    };

    // Handle tab change
    const handleTabChange = (tab: TabType) => {
        setActiveTab(tab);

        // Only add hash for non-default tabs
        if (tab !== 'courses') {
            window.location.hash = tab;
        } else {
            // Remove hash if it's the courses tab
            if (window.location.hash) {
                history.pushState("", document.title, window.location.pathname);
            }
        }
    };

    const handleCohortDelete = async (cohortId: number) => {
        try {
            // Refresh school data to get updated cohorts list
            const cohortsResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/cohorts/?org_id=${id}`);
            if (!cohortsResponse.ok) {
                throw new Error('Failed to fetch updated cohorts');
            }
            const cohortsData = await cohortsResponse.json();

            // Update school state with new cohorts
            setSchool(prev => prev ? {
                ...prev,
                cohorts: cohortsData
            } : null);

            // Show toast notification for successful deletion
            setToastMessage({
                title: 'Cohort removed',
                description: `Cohort has been removed from your school`,
                emoji: '✓'
            });
            setShowToast(true);
        } catch (error) {
            console.error('Error refreshing cohorts list:', error);
            // Here you would typically show an error message to the user
        }
    };

    const handleCourseDelete = async (courseId: string | number) => {
        try {
            // Refresh school data to get updated courses list
            const coursesResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/courses/?org_id=${id}`);
            if (!coursesResponse.ok) {
                throw new Error('Failed to fetch updated courses');
            }
            const coursesData = await coursesResponse.json();

            // Update school state with new courses
            setSchool(prev => prev ? {
                ...prev,
                courses: coursesData.map((course: any) => ({
                    id: course.id,
                    name: course.name,
                }))
            } : null);

            // Show toast notification for successful deletion
            setToastMessage({
                title: 'Course removed',
                description: `Course has been removed from your school`,
                emoji: '✓'
            });
            setShowToast(true);
        } catch (error) {
            console.error('Error refreshing courses list:', error);
            // Here you would typically show an error message to the user
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black text-white">
                <Header showCreateCourseButton={false} />
                <div className="flex justify-center items-center py-12">
                    <div className="w-12 h-12 border-t-2 border-b-2 border-white rounded-full animate-spin"></div>
                </div>
            </div>
        );
    }

    if (!school) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <p>School not found</p>
            </div>
        );
    }

    return (
        <>
            <Header showCreateCourseButton={false} />

            <div className="min-h-screen bg-black text-white">
                <div className="container mx-auto px-4 py-8">
                    <main>
                        {/* School header with title */}
                        <div className="mb-10">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <div className="w-12 h-12 bg-purple-700 rounded-lg flex items-center justify-center mr-4">
                                        <Building size={24} className="text-white" />
                                    </div>
                                    <div>
                                        <div className="flex items-center">
                                            <h1
                                                ref={schoolNameRef}
                                                contentEditable={isEditingName}
                                                suppressContentEditableWarning
                                                className={`text-3xl font-light outline-none ${isEditingName ? 'border-b border-white' : ''}`}
                                                onBlur={handleNameBlur}
                                                onKeyDown={handleNameKeyDown}
                                            >
                                                {school.name}
                                            </h1>
                                            {/* <button
                                                onClick={toggleNameEdit}
                                                className="ml-2 p-2 text-gray-400 hover:text-white"
                                                aria-label={isEditingName ? "Save school name" : "Edit school name"}
                                            >
                                                {isEditingName ? <Save size={16} /> : <Edit size={16} />}
                                            </button> */}
                                        </div>
                                        <div className="flex items-center mt-1">
                                            <p className="text-gray-400">{school.url}</p>
                                            <a
                                                href={school.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="ml-2 text-gray-400 hover:text-white transition-colors cursor-pointer"
                                                aria-label="Open school URL"
                                            >
                                                <ExternalLink size={14} />
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Tabs for navigation */}
                        <div className="mb-8">
                            <div className="flex border-b border-gray-800">
                                <button
                                    className={`px-4 py-2 font-light cursor-pointer ${activeTab === 'courses' ? 'text-white border-b-2 border-white' : 'text-gray-400 hover:text-white'}`}
                                    onClick={() => handleTabChange('courses')}
                                >
                                    <div className="flex items-center">
                                        <BookOpen size={16} className="mr-2" />
                                        Courses
                                    </div>
                                </button>
                                <button
                                    className={`px-4 py-2 font-light cursor-pointer ${activeTab === 'cohorts' ? 'text-white border-b-2 border-white' : 'text-gray-400 hover:text-white'}`}
                                    onClick={() => handleTabChange('cohorts')}
                                >
                                    <div className="flex items-center">
                                        <Layers size={16} className="mr-2" />
                                        Cohorts
                                    </div>
                                </button>
                                <button
                                    className={`px-4 py-2 font-light cursor-pointer ${activeTab === 'members' ? 'text-white border-b-2 border-white' : 'text-gray-400 hover:text-white'}`}
                                    onClick={() => handleTabChange('members')}
                                >
                                    <div className="flex items-center">
                                        <Users size={16} className="mr-2" />
                                        Team
                                    </div>
                                </button>
                                <button
                                    className={`px-4 py-2 font-light cursor-pointer ${activeTab === 'proctors' ? 'text-white border-b-2 border-white' : 'text-gray-400 hover:text-white'}`}
                                    onClick={() => handleTabChange('proctors')}
                                >
                                    <div className="flex items-center">
                                        <Users size={16} className="mr-2" />
                                        Proctoring
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Tab content */}
                        <div>
                            {/* Courses Tab */}
                            {activeTab === 'courses' && (
                                <div>
                                    {school.courses.length > 0 ? (
                                        <>
                                            <div className="flex justify-start items-center mb-6">
                                                <button
                                                    onClick={() => setIsCreateCourseDialogOpen(true)}
                                                    className="px-6 py-3 bg-white text-black text-sm font-medium rounded-full hover:opacity-90 transition-opacity inline-block cursor-pointer"
                                                >
                                                    Create Course
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                {school.courses.map(course => (
                                                    <CourseCard key={course.id} course={{
                                                        id: course.id,
                                                        title: course.name,
                                                    }} onDelete={handleCourseDelete} />
                                                ))}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-20">
                                            <h2 className="text-4xl font-light mb-4">What if your next big idea became a course?</h2>
                                            <p className="text-gray-400 mb-8">It might be easier than you think</p>
                                            <button
                                                onClick={() => setIsCreateCourseDialogOpen(true)}
                                                className="px-6 py-3 bg-white text-black text-sm font-medium rounded-full hover:opacity-90 transition-opacity inline-block cursor-pointer"
                                            >
                                                Create Course
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Cohorts Tab */}
                            {activeTab === 'cohorts' && (
                                <div>
                                    {school.cohorts.length > 0 ? (
                                        <>
                                            <div className="flex justify-start items-center mb-6">
                                                <button
                                                    className="px-6 py-3 bg-white text-black text-sm font-medium rounded-full hover:opacity-90 transition-opacity focus:outline-none cursor-pointer"
                                                    onClick={() => {
                                                        setIsCreateCohortDialogOpen(true);
                                                    }}
                                                >
                                                    Create Cohort
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                {school.cohorts.map(cohort => (
                                                    <CohortCard
                                                        key={cohort.id}
                                                        cohort={cohort}
                                                        schoolId={school.id}
                                                        onDelete={handleCohortDelete}
                                                    />
                                                ))}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-20">
                                            <h2 className="text-4xl font-light mb-4">Bring your courses to life with cohorts</h2>
                                            <p className="text-gray-400 mb-8">Create groups of learners and assign them courses to learn together</p>
                                            <button
                                                className="px-6 py-3 bg-white text-black text-sm font-medium rounded-full hover:opacity-90 transition-opacity focus:outline-none cursor-pointer"
                                                onClick={() => {
                                                    setIsCreateCohortDialogOpen(true);
                                                }}
                                            >
                                                Create Cohort
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Team Tab */}
                            {activeTab === 'members' && (
                                <div>
                                    <div className="flex justify-start items-center mb-6">
                                        <button
                                            className="px-6 py-3 bg-white text-black text-sm font-medium rounded-full hover:opacity-90 transition-opacity focus:outline-none cursor-pointer"
                                            onClick={() => setIsInviteDialogOpen(true)}
                                        >
                                            Invite Members
                                        </button>
                                    </div>

                                    <div className="overflow-hidden rounded-lg border border-gray-800">
                                        <table className="min-w-full divide-y divide-gray-800">
                                            <thead className="bg-gray-900">
                                                <tr>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Email</th>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Role</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-[#111] divide-y divide-gray-800">
                                                {school.members.map(member => (
                                                    <tr key={member.id}>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{member.email}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm flex justify-between items-center">
                                                            <span className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs font-medium ${member.role === 'owner' ? 'bg-purple-900 text-purple-200' : 'bg-gray-800 text-gray-300'}`}>
                                                                {member.role === 'owner' ? 'Owner' : 'Admin'}
                                                            </span>
                                                            {member.role !== 'owner' && (
                                                                <button
                                                                    onClick={() => handleDeleteMember(member)}
                                                                    className="flex items-center gap-1 text-gray-400 hover:text-red-500 transition-colors focus:outline-none cursor-pointer"
                                                                    aria-label="Remove Member"
                                                                >
                                                                    <Trash2 size={18} />
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'proctors' && (
                                <div className="space-y-6">
                                <div className="flex justify-start items-center mb-6">
                                    <h2 className="text-2xl font-semibold text-gray-300">Proctoring Dashboard</h2>
                                </div>
                            
                                {/* Error and Loading States */}
                                {loading && <div className="text-center text-gray-400 py-16">Loading proctor logs...</div>}
                                {error && <div className="text-center text-red-500 py-16">{error}</div>}
                            
                                {/* Chart Section */}
                                <div className="bg-[#1a1a1a] p-6 rounded-lg shadow-lg">
                                    <h3 className="text-xl font-semibold text-gray-300 mb-4">Metrics Overview</h3>
                                    
                                    {proctorLogs.map((log: ProctorLog, index: number) => {
                                        // Calculate total score for each user
                                        const calculateTotalScore = (log: ProctorLog) => {
                                            let voiceDetectionScore = log.voiceDetectionCount > 2 ? 10 : 0;
                                            let tabSwitchScore = log.tabSwitchCount > 5 ? 15 : 0;
                                            let copyScore = log.copyCount > 0 ? 20 : 0;
                                            let pasteScore = log.pasteCount > 0 ? 10 : 0;
                                            
                                            return voiceDetectionScore + tabSwitchScore + copyScore + pasteScore;
                                          };
                                          
                                          const totalScore = calculateTotalScore(log);
                                        const percentage = ((totalScore / 55) * 100);
                            
                                        return (
                                            <div key={index} className="mb-8">
                                                <h4 className="text-lg font-medium text-gray-300 mb-2">Student - {log.userId}</h4>
                                                <h4 className="text-lg font-medium text-gray-300 mb-2">Module - {log.moduleId}</h4>
                                                <Bar 
                                                    data={{
                                                        labels: ['Voice', 'Tab Switch', 'Copy', 'Paste'],
                                                        datasets: [
                                                            {
                                                                label: 'Proctoring Metrics',
                                                                data: [
                                                                    log.voiceDetectionCount,
                                                                    log.tabSwitchCount,
                                                                    log.copyCount,
                                                                    log.pasteCount,
                                                                ],
                                                                backgroundColor: [
                                                                    'rgba(59, 130, 246, 0.5)', // Blue
                                                                    'rgba(255, 165, 0, 0.5)', // Amber
                                                                    'rgba(255, 99, 132, 0.5)', // Red
                                                                    'rgba(75, 192, 192, 0.5)', // Green
                                                                ],
                                                            },
                                                        ],
                                                    }}
                                                    options={{
                                                        responsive: true,
                                                        plugins: {
                                                            title: {
                                                                display: true,
                                                                text: `${log.userId} - Proctoring Metrics`
                                                            },
                                                            tooltip: {
                                                                callbacks: {
                                                                    label: function(tooltipItem: any) {
                                                                        const score = tooltipItem.raw;
                                                                        return `${tooltipItem.dataset.label}: ${score}`;
                                                                    },
                                                                },
                                                            },
                                                        },
                                                    }}
                                                />
                            
                                                {/* Display the calculated percentage below each user's bar chart */}
                                                <div className="text-center text-gray-300 mt-2">
                                                    <span className="font-semibold">Cheat Score Percentage:</span> {percentage}%
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            
                            </div>
                            )}
                        </div>
                    </main>
                </div>
            </div>

            {/* Invite Members Dialog */}
            <InviteMembersDialog
                open={isInviteDialogOpen}
                onClose={() => setIsInviteDialogOpen(false)}
                onInvite={handleInviteMembers}
            />

            {/* Delete Member Confirmation Dialog */}
            <ConfirmationDialog
                show={isDeleteConfirmOpen}
                title="Remove Member"
                message={`Are you sure you want to remove ${memberToDelete?.email} from this organization?`}
                confirmButtonText="Remove"
                onConfirm={confirmDeleteMember}
                onCancel={() => setIsDeleteConfirmOpen(false)}
                type="delete"
            />

            {/* Create Cohort Dialog */}
            <CreateCohortDialog
                open={isCreateCohortDialogOpen}
                onClose={() => setIsCreateCohortDialogOpen(false)}
                onCreateCohort={handleCreateCohort}
                schoolId={id}
            />

            {/* Create Course Dialog */}
            <CreateCourseDialog
                open={isCreateCourseDialogOpen}
                onClose={() => setIsCreateCourseDialogOpen(false)}
                onSuccess={handleCourseCreationSuccess}
                schoolId={id}
            />

            {/* Toast notification */}
            <Toast
                show={showToast}
                title={toastMessage.title}
                description={toastMessage.description}
                emoji={toastMessage.emoji}
                onClose={() => setShowToast(false)}
            />
        </>
    );
} 