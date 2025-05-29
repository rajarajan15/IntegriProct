"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronUp, ChevronDown, X, ChevronRight, ChevronDown as ChevronDownExpand, Plus, BookOpen, HelpCircle, Trash, Zap, Eye, Check, FileEdit, Clipboard, ArrowLeft, Pencil, Users, UsersRound, ExternalLink, Sparkles, Loader2 } from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { useRouter, useParams } from "next/navigation";
import CourseModuleList from "@/components/CourseModuleList";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import Toast from "@/components/Toast";
import CoursePublishSuccessBanner from "@/components/CoursePublishSuccessBanner";
import { Module, ModuleItem, LearningMaterial, Quiz, Exam } from "@/types/course";
import { Milestone } from "@/types";
import { transformMilestonesToModules } from "@/lib/course";
import { CourseCohortSelectionDialog } from "@/components/CourseCohortSelectionDialog";
import { addModule } from "@/lib/api";
import Tooltip from "@/components/Tooltip";
import GenerateWithAIDialog, { GenerateWithAIFormData } from '@/components/GenerateWithAIDialog';

// Import the QuizQuestion type
import { QuizQuestion, QuizQuestionConfig } from "../../../../../../types/quiz";

// Import the CreateCohortDialog
import CreateCohortDialog from '@/components/CreateCohortDialog';

interface CourseDetails {
    id: number;
    name: string;
    milestones?: Milestone[];
}

// Default configuration for new questions
const defaultQuestionConfig: QuizQuestionConfig = {
    inputType: 'text',
    responseType: 'chat',
    questionType: 'objective',
    knowledgeBaseBlocks: [],
    linkedMaterialIds: [],
};


export default function CreateCourse() {
    const router = useRouter();
    const params = useParams();
    const schoolId = params.id as string;
    const courseId = params.courseId as string;

    const [courseTitle, setCourseTitle] = useState("Loading course...");
    const [modules, setModules] = useState<Module[]>([]);
    const [activeItem, setActiveItem] = useState<ModuleItem | null>(null);
    const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isPreviewMode, setIsPreviewMode] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const [lastUsedColorIndex, setLastUsedColorIndex] = useState<number>(-1);
    const [isCourseTitleEditing, setIsCourseTitleEditing] = useState(false);
    const [isEditMode, setIsEditMode] = useState<boolean>(false);
    const [showPublishConfirmation, setShowPublishConfirmation] = useState(false);
    const [showPublishDialog, setShowPublishDialog] = useState(false);
    const [cohorts, setCohorts] = useState<any[]>([]);
    const [isLoadingCohorts, setIsLoadingCohorts] = useState(false);
    const [cohortSearchQuery, setCohortSearchQuery] = useState('');
    const [filteredCohorts, setFilteredCohorts] = useState<any[]>([]);
    const [cohortError, setCohortError] = useState<string | null>(null);
    // Add state for temporarily selected cohorts
    const [tempSelectedCohorts, setTempSelectedCohorts] = useState<any[]>([]);
    // Add state for course cohorts
    const [courseCohorts, setCourseCohorts] = useState<any[]>([]);
    const [isLoadingCourseCohorts, setIsLoadingCourseCohorts] = useState(false);
    // Add state to track total cohorts in the school
    const [totalSchoolCohorts, setTotalSchoolCohorts] = useState<number>(0);
    // Add refs for both buttons to position the dropdown
    const publishButtonRef = useRef<HTMLButtonElement>(null);
    const addCohortButtonRef = useRef<HTMLButtonElement>(null);
    // Add state to track which button opened the dialog
    const [dialogOrigin, setDialogOrigin] = useState<'publish' | 'add' | null>(null);
    // Add state for toast notifications
    const [toast, setToast] = useState({
        show: false,
        title: '',
        description: '',
        emoji: ''
    });
    // Add state for cohort removal confirmation
    const [cohortToRemove, setCohortToRemove] = useState<{ id: number, name: string } | null>(null);
    const [showRemoveCohortConfirmation, setShowRemoveCohortConfirmation] = useState(false);

    // Add state for celebratory banner
    const [showCelebratoryBanner, setShowCelebratoryBanner] = useState(false);
    const [celebrationDetails, setCelebrationDetails] = useState({
        cohortCount: 0,
        cohortNames: [] as string[]
    });

    // Add a new state for direct create cohort dialog
    const [showCreateCohortDialog, setShowCreateCohortDialog] = useState(false);

    // Add state for AI generation dialog
    const [showGenerateDialog, setShowGenerateDialog] = useState(false);

    // Add state for course generation loading state
    const [isGeneratingCourse, setIsGeneratingCourse] = useState(false);

    const [isCourseStructureGenerated, setIsCourseStructureGenerated] = useState(false);

    // Add state for generation progress messages
    const [generationProgress, setGenerationProgress] = useState<string[]>([]);

    // Add a ref to store the WebSocket connection
    const wsRef = useRef<WebSocket | null>(null);
    // Add a ref for the heartbeat interval
    const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Add these new state variables after the existing state declarations
    const [totalTasksToGenerate, setTotalTasksToGenerate] = useState(0);
    const [generatedTasksCount, setGeneratedTasksCount] = useState(0);

    // Add a new state variable to track generation completion
    const [isGenerationComplete, setIsGenerationComplete] = useState(false);

    // Add these refs after the existing refs declaration
    const isGeneratingCourseRef = useRef(false);
    const totalTasksToGenerateRef = useRef(0);
    const generatedTasksCountRef = useRef(0);

    // Update the refs whenever the state changes
    useEffect(() => {
        isGeneratingCourseRef.current = isGeneratingCourse;
    }, [isGeneratingCourse]);

    useEffect(() => {
        totalTasksToGenerateRef.current = totalTasksToGenerate;
    }, [totalTasksToGenerate]);

    useEffect(() => {
        generatedTasksCountRef.current = generatedTasksCount;
    }, [generatedTasksCount]);

    // Extract fetchCourseDetails as a standalone function
    const fetchCourseDetails = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/courses/${courseId}?only_published=false`);

            if (!response.ok) {
                throw new Error(`Failed to fetch course details: ${response.status}`);
            }

            const data = await response.json();
            setCourseTitle(data.name);

            // Check if milestones are available in the response
            if (data.milestones && Array.isArray(data.milestones)) {
                // Use the shared utility function to transform the milestones to modules
                const transformedModules = transformMilestonesToModules(data.milestones);

                // Add isEditing property required by the admin view
                const modulesWithEditing = transformedModules.map(module => ({
                    ...module,
                    isEditing: false
                }));

                // Check if any task in the course has isGenerating = true
                const totalTasksToGenerate = modulesWithEditing.reduce((count, module) =>
                    count + (module.items?.filter(item => item.isGenerating !== null)?.length || 0), 0
                );
                const generatedTasksCount = modulesWithEditing.reduce((count, module) =>
                    count + (module.items?.filter(item => item.isGenerating === false)?.length || 0), 0
                );

                // Set up WebSocket connection if any task is being generated
                if (totalTasksToGenerate && totalTasksToGenerate != generatedTasksCount) {
                    const ws = setupGenerationWebSocket();

                    if (!ws) {
                        throw new Error('Failed to setup WebSocket connection');
                    }

                    wsRef.current = ws;
                    console.log('WebSocket connection established for active generation task');

                    setIsGeneratingCourse(true);
                    setIsCourseStructureGenerated(true);
                    setIsGenerationComplete(false);
                    setTotalTasksToGenerate(totalTasksToGenerate);
                    setGeneratedTasksCount(generatedTasksCount);
                    setGenerationProgress(["Uploaded reference material", 'Generating course plan', 'Course plan complete', 'Generating learning materials and quizzes']);
                }

                // Set the modules state
                setModules(modulesWithEditing);
            }

            setIsLoading(false);
        } catch (err) {
            console.error("Error fetching course details:", err);
            setError("Failed to load course details. Please try again later.");
            setIsLoading(false);
        }
    };

    // Fetch course details from the backend
    useEffect(() => {
        fetchCourseDetails();

        // Also fetch cohorts assigned to this course
        fetchCourseCohorts();
    }, [courseId]);

    // Check for dark mode
    useEffect(() => {
        setIsDarkMode(true);
        // setIsDarkMode(document.documentElement.classList.contains('dark'));

        // Optional: Listen for changes to the dark mode
        // const observer = new MutationObserver((mutations) => {
        //     mutations.forEach((mutation) => {
        //         if (mutation.attributeName === 'class') {
        //             setIsDarkMode(document.documentElement.classList.contains('dark'));
        //         }
        //     });
        // });

        // observer.observe(document.documentElement, { attributes: true });

        // return () => {
        //     observer.disconnect();
        // };
    }, []);

    // Set initial content and focus on newly added modules and items
    useEffect(() => {
        // Focus the newly added module
        if (activeModuleId) {
            const moduleElement = document.querySelector(`[data-module-id="${activeModuleId}"]`) as HTMLHeadingElement;

            if (moduleElement) {
                moduleElement.focus();
            }
        }

        // Focus the newly added item
        if (activeItem && activeItem.id) {
            const itemElement = document.querySelector(`[data-item-id="${activeItem.id}"]`) as HTMLHeadingElement;

            if (itemElement) {
                itemElement.focus();
            }
        }
    }, [modules, activeModuleId, activeItem]);

    // Handle Escape key to close dialog
    useEffect(() => {
        const handleEscKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isDialogOpen) {
                closeDialog();
            }
        };

        window.addEventListener('keydown', handleEscKey);
        return () => {
            window.removeEventListener('keydown', handleEscKey);
        };
    }, [isDialogOpen]);

    // Handle clicks outside of the dropdown for the publish dialog

    // Add back the handleKeyDown function for module titles
    const handleKeyDown = (e: React.KeyboardEvent<HTMLHeadingElement>) => {
        // Prevent creating a new line when pressing Enter
        if (e.key === "Enter") {
            e.preventDefault();

            // Remove focus
            (e.currentTarget as HTMLHeadingElement).blur();
        }
    };

    const updateModuleTitle = (id: string, title: string) => {
        setModules(modules.map(module =>
            module.id === id ? { ...module, title } : module
        ));
    };

    const toggleModuleEditing = (id: string, isEditing: boolean) => {
        setModules(modules.map(module =>
            module.id === id ? { ...module, isEditing } : module
        ));
    };

    const deleteModule = (id: string) => {
        setModules(prevModules => {
            const filteredModules = prevModules.filter(module => module.id !== id);
            // Update positions after deletion
            return filteredModules.map((module, index) => ({
                ...module,
                position: index
            }));
        });
    };

    const moveModuleUp = (id: string) => {
        setModules(prevModules => {
            const index = prevModules.findIndex(module => module.id === id);
            if (index <= 0) return prevModules;

            const newModules = [...prevModules];
            // Swap with previous module
            [newModules[index - 1], newModules[index]] = [newModules[index], newModules[index - 1]];

            // Update positions
            return newModules.map((module, idx) => ({
                ...module,
                position: idx
            }));
        });
    };

    const moveModuleDown = (id: string) => {
        setModules(prevModules => {
            const index = prevModules.findIndex(module => module.id === id);
            if (index === -1 || index === prevModules.length - 1) return prevModules;

            const newModules = [...prevModules];
            // Swap with next module
            [newModules[index], newModules[index + 1]] = [newModules[index + 1], newModules[index]];

            // Update positions
            return newModules.map((module, idx) => ({
                ...module,
                position: idx
            }));
        });
    };

    const toggleModule = (id: string) => {
        setModules(modules.map(module =>
            module.id === id ? { ...module, isExpanded: !module.isExpanded } : module
        ));
    };

    const addLearningMaterial = async (moduleId: string) => {
        try {
            // Make API request to create a new learning material
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/tasks/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    course_id: parseInt(courseId),
                    milestone_id: parseInt(moduleId),
                    type: "learning_material",
                    title: "New Learning Material",
                    status: "draft",
                    scheduled_publish_at: null
                }),
            });

            if (!response.ok) {
                throw new Error(`Failed to create learning material: ${response.status}`);
            }

            // Get the learning material ID from the response
            const data = await response.json();
            console.log("Learning material created successfully:", data);

            // Update the UI only after the API request is successful
            setModules(modules.map(module => {
                if (module.id === moduleId) {
                    const newItem: LearningMaterial = {
                        id: data.id.toString(), // Use the ID from the API
                        title: "New Learning Material",
                        position: module.items.length,
                        type: 'material',
                        content: [], // Empty content, the editor will initialize with default content
                        status: 'draft',
                        scheduled_publish_at: null
                    };

                    setActiveItem(newItem);
                    setActiveModuleId(moduleId);

                    return {
                        ...module,
                        items: [...module.items, newItem]
                    };
                }
                return module;
            }));
        } catch (error) {
            console.error("Error creating learning material:", error);
            // You might want to show an error message to the user here
        }
    };

    const addQuiz = async (moduleId: string) => {
        try {
            // Make API request to create a new quiz
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/tasks/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    course_id: parseInt(courseId),
                    milestone_id: parseInt(moduleId),
                    type: "quiz",
                    title: "New Quiz",
                    status: "draft"
                }),
            });

            if (!response.ok) {
                throw new Error(`Failed to create quiz: ${response.status}`);
            }

            // Get the quiz ID from the response
            const data = await response.json();
            console.log("Quiz created successfully:", data);

            // Update the UI only after the API request is successful
            setModules(modules.map(module => {
                if (module.id === moduleId) {
                    const newItem: Quiz = {
                        id: data.id.toString(), // Use the ID from the API
                        title: "New Quiz",
                        position: module.items.length,
                        type: 'quiz',
                        questions: [{
                            id: `question-${Date.now()}`,
                            content: [],
                            config: { ...defaultQuestionConfig }
                        }],
                        status: 'draft',
                        scheduled_publish_at: null
                    };

                    setActiveItem(newItem);
                    setActiveModuleId(moduleId);

                    return {
                        ...module,
                        items: [...module.items, newItem]
                    };
                }
                return module;
            }));
        } catch (error) {
            console.error("Error creating quiz:", error);
            // You might want to show an error message to the user here
        }
    };

    const addExam = async (moduleId: string) => {
        try {
            // Make API request to create a new exam
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/tasks/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    course_id: parseInt(courseId),
                    milestone_id: parseInt(moduleId),
                    type: "exam",
                    title: "New Exam",
                    status: "draft"
                }),
            });

            if (!response.ok) {
                throw new Error(`Failed to create exam: ${response.status}`);
            }

            // Get the exam ID from the response
            const data = await response.json();
            console.log("Exam created successfully:", data);

            // Update the UI only after the API request is successful
            setModules(modules.map(module => {
                if (module.id === moduleId) {
                    const newItem: Exam = {
                        id: data.id.toString(), // Use the ID from the API
                        title: "New Exam",
                        position: module.items.length,
                        type: 'exam',
                        questions: [],
                        status: 'draft',
                        scheduled_publish_at: null
                    };

                    setActiveItem(newItem);
                    setActiveModuleId(moduleId);

                    return {
                        ...module,
                        items: [...module.items, newItem]
                    };
                }
                return module;
            }));
        } catch (error) {
            console.error("Error creating exam:", error);
            // You might want to show an error message to the user here
        }
    };

    const deleteItem = (moduleId: string, itemId: string) => {
        setModules(modules.map(module => {
            if (module.id === moduleId) {
                const filteredItems = module.items.filter(item => item.id !== itemId);
                return {
                    ...module,
                    items: filteredItems.map((item, index) => ({
                        ...item,
                        position: index
                    }))
                };
            }
            return module;
        }));
    };

    const moveItemUp = (moduleId: string, itemId: string) => {
        setModules(modules.map(module => {
            if (module.id === moduleId) {
                const index = module.items.findIndex(item => item.id === itemId);
                if (index <= 0) return module;

                const newItems = [...module.items];
                [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];

                return {
                    ...module,
                    items: newItems.map((item, idx) => ({
                        ...item,
                        position: idx
                    }))
                };
            }
            return module;
        }));
    };

    const moveItemDown = (moduleId: string, itemId: string) => {
        setModules(modules.map(module => {
            if (module.id === moduleId) {
                const index = module.items.findIndex(item => item.id === itemId);
                if (index === -1 || index === module.items.length - 1) return module;

                const newItems = [...module.items];
                [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];

                return {
                    ...module,
                    items: newItems.map((item, idx) => ({
                        ...item,
                        position: idx
                    }))
                };
            }
            return module;
        }));
    };

    // Open the dialog for editing a learning material or quiz
    const openItemDialog = (moduleId: string, itemId: string) => {
        const module = modules.find(m => m.id === moduleId);
        if (!module) return;

        const item = module.items.find(i => i.id === itemId);
        if (!item) return;

        // Ensure quiz items have questions property initialized
        if (item.type === 'quiz' && !item.questions) {
            const updatedItem = {
                ...item,
                questions: [{ id: `question-${Date.now()}`, content: [], config: { ...defaultQuestionConfig } }]
            } as Quiz;

            // Update the module with the fixed item
            setModules(prevModules =>
                prevModules.map(m =>
                    m.id === moduleId
                        ? {
                            ...m,
                            items: m.items.map(i => i.id === itemId ? updatedItem : i)
                        }
                        : m
                ) as Module[]
            );

            setActiveItem(updatedItem);
            setActiveModuleId(moduleId);
            setIsPreviewMode(false);
            setIsDialogOpen(true);
        } else if (item.type === 'material') {
            // For learning materials, we don't need to fetch content here
            // The LearningMaterialEditor will fetch its own data using the taskId
            setActiveItem(item);
            setActiveModuleId(moduleId);
            setIsPreviewMode(false);
            setIsDialogOpen(true);
        } else {
            // For other types like exams, just open the dialog
            setActiveItem(item);
            setActiveModuleId(moduleId);
            setIsPreviewMode(false);
            setIsDialogOpen(true);
        }
    };

    // Close the dialog
    const closeDialog = () => {
        // Dialog confirmation is handled by CourseItemDialog component
        setIsDialogOpen(false);
        setActiveItem(null);
        setActiveModuleId(null);
        setIsEditMode(false);
    };

    // Cancel edit mode and revert to original state
    const cancelEditMode = () => {
        // For learning materials, the LearningMaterialEditor has already reverted the changes
        // We need to revert the activeItem object to reflect the original state
        if (activeItem && activeModuleId && activeItem.type === 'material') {
            // Find the original module item from modules state
            const module = modules.find(m => m.id === activeModuleId);
            if (module) {
                const originalItem = module.items.find(i => i.id === activeItem.id);
                if (originalItem) {
                    // Reset activeItem to match the original state
                    setActiveItem({
                        ...originalItem
                    });
                }
            }
        }

        // Exit edit mode without saving changes
        setIsEditMode(false);
    };

    // Handle dialog title change
    const handleDialogTitleChange = (e: React.FormEvent<HTMLHeadingElement>) => {
        if (!activeItem || !activeModuleId) return;

        // Skip title updates for learning materials - they manage their own titles
        // and only emit changes after publishing
        if (activeItem.type === 'material') return;

        const newTitle = e.currentTarget.textContent || "";

        // Update the title in the API - only for quizzes and exams
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/tasks/${activeItem.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title: newTitle
            }),
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to update title: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                // Update the active item
                setActiveItem({
                    ...activeItem,
                    title: newTitle
                });

                // Update the modules state
                setModules(prevModules =>
                    prevModules.map(module => {
                        if (module.id === activeModuleId) {
                            return {
                                ...module,
                                items: module.items.map(item => {
                                    if (item.id === activeItem.id) {
                                        return {
                                            ...item,
                                            title: newTitle
                                        };
                                    }
                                    return item;
                                })
                            };
                        }
                        return module;
                    })
                );
            })
            .catch(error => {
                console.error("Error updating title:", error);
            });
    };

    // Add a function to update quiz questions
    const updateQuizQuestions = (moduleId: string, itemId: string, questions: QuizQuestion[]) => {
        setModules(prevModules =>
            prevModules.map(module => {
                if (module.id === moduleId) {
                    return {
                        ...module,
                        items: module.items.map(item => {
                            if (item.id === itemId && item.type === 'quiz') {
                                return {
                                    ...item,
                                    questions
                                } as Quiz;
                            }
                            return item;
                        })
                    };
                }
                return module;
            })
        );
    };

    // Handle quiz content changes
    const handleQuizContentChange = (questions: QuizQuestion[]) => {
        if (activeItem && activeModuleId && activeItem.type === 'quiz') {
            updateQuizQuestions(activeModuleId, activeItem.id, questions);
        }
    };

    // Add a new function to handle the actual publishing after confirmation
    const handleConfirmPublish = async () => {
        if (!activeItem || !activeModuleId) {
            console.error("Cannot publish: activeItem or activeModuleId is missing");
            setShowPublishConfirmation(false);
            return;
        }

        console.log("handleConfirmPublish called with activeItem:", activeItem);
        console.log("Scheduled publish date from activeItem:", activeItem.scheduled_publish_at);

        // For learning materials and quizzes, the API call is now handled in their respective components
        // We need to update the modules list to reflect the status change
        // The title update is handled in the CourseItemDialog's onPublishSuccess callback

        // Update the module item in the modules list with the updated status and title
        updateModuleItemAfterPublish(activeModuleId, activeItem.id, 'published', activeItem.title, activeItem.scheduled_publish_at);

        console.log("Module item updated with status 'published' and title:", activeItem.title);
        console.log("Module item updated with scheduled_publish_at:", activeItem.scheduled_publish_at);

        // Hide the confirmation dialog
        setShowPublishConfirmation(false);
    };

    // Add a function to update a module item's status and title
    const updateModuleItemAfterPublish = (moduleId: string, itemId: string, status: string, title: string, scheduled_publish_at: string | null) => {
        setModules(prevModules =>
            prevModules.map(module => {
                if (module.id === moduleId) {
                    return {
                        ...module,
                        items: module.items.map(item => {
                            if (item.id === itemId) {
                                // Get numQuestions from activeItem if available (for quizzes/exams)
                                const numQuestions = activeItem &&
                                    (activeItem.type === 'quiz' || activeItem.type === 'exam') &&
                                    activeItem.questions ?
                                    activeItem.questions.length : undefined;

                                return {
                                    ...item,
                                    status,
                                    title,
                                    scheduled_publish_at,
                                    ...(numQuestions !== undefined && (item.type === 'quiz' || item.type === 'exam') ? { numQuestions } : {})
                                };
                            }
                            return item;
                        })
                    };
                }
                return module;
            })
        );
    };

    // Add a function to handle canceling the publish action
    const handleCancelPublish = () => {
        setShowPublishConfirmation(false);
    };

    const saveModuleTitle = async (moduleId: string) => {
        // Find the heading element by data attribute
        const headingElement = document.querySelector(`[data-module-id="${moduleId}"]`) as HTMLHeadingElement;
        if (headingElement) {
            // Get the current content
            const newTitle = headingElement.textContent || "";

            try {
                // Make API call to update the milestone on the server
                const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/milestones/${moduleId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        name: newTitle
                    }),
                });

                if (!response.ok) {
                    throw new Error(`Failed to update module title: ${response.status}`);
                }

                // If successful, update the state
                updateModuleTitle(moduleId, newTitle);
                console.log("Module title updated successfully");

                // Show toast notification
                setToast({
                    show: true,
                    title: 'A makeover',
                    description: `Module name updated successfully`,
                    emoji: '✨'
                });

                // Auto-hide toast after 3 seconds
                setTimeout(() => {
                    setToast(prev => ({ ...prev, show: false }));
                }, 3000);
            } catch (error) {
                console.error("Error updating module title:", error);

                // Still update the local state even if the API call fails
                // This provides a better user experience while allowing for retry later
                updateModuleTitle(moduleId, newTitle);

                // Show error toast
                setToast({
                    show: true,
                    title: 'Update Failed',
                    description: 'Failed to update module title, but changes were saved locally',
                    emoji: '⚠️'
                });

                // Auto-hide toast after 3 seconds
                setTimeout(() => {
                    setToast(prev => ({ ...prev, show: false }));
                }, 3000);
            }
        }

        // Turn off editing mode
        toggleModuleEditing(moduleId, false);
    };

    const cancelModuleEditing = (moduleId: string) => {
        // Find the heading element
        const headingElement = document.querySelector(`[data-module-id="${moduleId}"]`) as HTMLHeadingElement;
        if (headingElement) {
            // Reset the content to the original title from state
            const module = modules.find(m => m.id === moduleId);
            if (module) {
                headingElement.textContent = module.title;
            }
        }
        // Turn off editing mode
        toggleModuleEditing(moduleId, false);
    };

    // Add this helper function before the return statement
    const hasAnyItems = () => {
        return modules.some(module =>
            module.items.some(item => item.status !== 'draft')
        );
    };

    // Add these functions for course title editing
    const handleCourseTitleInput = (e: React.FormEvent<HTMLHeadingElement>) => {
        // Just store the current text content, but don't update the state yet
        // This prevents React from re-rendering and resetting the cursor
        const newTitle = e.currentTarget.textContent || "";

        // We'll update the state when the user finishes editing
    };

    const saveCourseTitle = () => {
        if (titleRef.current) {
            const newTitle = titleRef.current.textContent || "";

            // Make a PUT request to update the course name
            fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/courses/${courseId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: newTitle
                })
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Failed to update course: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    // Update the course title in the UI
                    setCourseTitle(newTitle);
                    console.log("Course updated successfully:", data);
                })
                .catch(err => {
                    console.error("Error updating course:", err);
                    // Revert to the original title in case of error
                    if (titleRef.current) {
                        titleRef.current.textContent = courseTitle;
                    }
                });

            setIsCourseTitleEditing(false);
        }
    };

    const cancelCourseTitleEditing = () => {
        if (titleRef.current) {
            titleRef.current.textContent = courseTitle;
        }
        setIsCourseTitleEditing(false);
    };

    // Helper function to set cursor at the end of a contentEditable element
    const setCursorToEnd = (element: HTMLElement) => {
        if (!element) return;

        const range = document.createRange();
        const selection = window.getSelection();

        // Clear any existing selection first
        selection?.removeAllRanges();

        // Set range to end of content
        range.selectNodeContents(element);
        range.collapse(false); // false means collapse to end

        // Apply the selection
        selection?.addRange(range);
        element.focus();
    };

    // For course title editing
    const enableCourseTitleEditing = () => {
        setIsCourseTitleEditing(true);

        // Need to use setTimeout to ensure the element is editable before focusing
        setTimeout(() => {
            if (titleRef.current) {
                setCursorToEnd(titleRef.current);
            }
        }, 0);
    };

    // For module title editing
    const enableModuleEditing = (moduleId: string) => {
        toggleModuleEditing(moduleId, true);

        // More reliable method to set cursor at end with a sufficient delay
        setTimeout(() => {
            const moduleElement = document.querySelector(`h2[contenteditable="true"]`) as HTMLElement;
            if (moduleElement && moduleElement.textContent) {
                // Create a text node at the end for more reliable cursor placement
                const textNode = moduleElement.firstChild;
                if (textNode) {
                    const selection = window.getSelection();
                    const range = document.createRange();

                    // Place cursor at the end of the text
                    range.setStart(textNode, textNode.textContent?.length || 0);
                    range.setEnd(textNode, textNode.textContent?.length || 0);

                    selection?.removeAllRanges();
                    selection?.addRange(range);
                }
                moduleElement.focus();
            }
        }, 100); // Increased delay for better reliability
    };

    // Modified function to enable edit mode
    const enableEditMode = () => {
        setIsEditMode(true);

        // Focus the title for editing is now handled in CourseModuleList
    };

    // Save the current item
    const saveItem = async () => {
        if (!activeItem || !activeModuleId) return;

        // Update the modules state to reflect any changes in the UI
        setModules(prevModules =>
            prevModules.map(module => {
                if (module.id === activeModuleId) {
                    return {
                        ...module,
                        items: module.items.map(item => {
                            if (item.id === activeItem.id) {
                                // Common properties to update for all item types
                                const commonUpdates = {
                                    title: activeItem.title,
                                    scheduled_publish_at: activeItem.scheduled_publish_at
                                };

                                // Create updated items based on type with proper type assertions
                                if (item.type === 'material' && activeItem.type === 'material') {
                                    return {
                                        ...item,
                                        ...commonUpdates,
                                        content: activeItem.content
                                    };
                                } else if (item.type === 'quiz' && activeItem.type === 'quiz') {
                                    return {
                                        ...item,
                                        ...commonUpdates,
                                        questions: activeItem.questions
                                    };
                                } else if (item.type === 'exam' && activeItem.type === 'exam') {
                                    return {
                                        ...item,
                                        ...commonUpdates,
                                        questions: activeItem.questions
                                    };
                                }

                                // Default case - update common properties
                                return {
                                    ...item,
                                    ...commonUpdates
                                };
                            }
                            return item;
                        })
                    };
                }
                return module;
            })
        );

        // Exit edit mode
        setIsEditMode(false);
    };

    const handleCohortSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setCohortSearchQuery(query);

        // Always filter the existing cohorts client-side
        if (cohorts.length > 0) {
            if (query.trim() === '') {
                // Filter out temporarily selected cohorts
                setFilteredCohorts(cohorts.filter(cohort =>
                    !tempSelectedCohorts.some(tc => tc.id === cohort.id)
                ));
            } else {
                // Filter by search query and exclude temporarily selected cohorts
                const filtered = cohorts.filter(cohort =>
                    cohort.name.toLowerCase().includes(query.toLowerCase()) &&
                    !tempSelectedCohorts.some(tc => tc.id === cohort.id)
                );
                setFilteredCohorts(filtered);
            }
        }
    };

    // Update fetchCohorts to only be called once when dialog opens
    const fetchCohorts = async () => {
        try {
            setIsLoadingCohorts(true);
            setCohortError(null);

            // First, fetch cohorts that are already assigned to this course
            const courseCohortResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/courses/${courseId}/cohorts`);
            let assignedCohortIds: number[] = [];

            if (courseCohortResponse.ok) {
                const courseCohortData = await courseCohortResponse.json();
                assignedCohortIds = courseCohortData.map((cohort: { id: number }) => cohort.id);
                setCourseCohorts(courseCohortData);
            }

            // Then, fetch all cohorts for the organization
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/cohorts/?org_id=${schoolId}`);

            if (!response.ok) {
                throw new Error(`Failed to fetch cohorts: ${response.status}`);
            }

            const data = await response.json();

            // Store the total number of cohorts in the school
            setTotalSchoolCohorts(data.length);

            // Filter out cohorts that are already assigned to the course
            const availableCohorts = data.filter((cohort: { id: number }) =>
                !assignedCohortIds.includes(cohort.id)
            );

            setCohorts(availableCohorts);

            // Filter out any temporarily selected cohorts
            setFilteredCohorts(availableCohorts.filter((cohort: { id: number; name: string }) =>
                !tempSelectedCohorts.some(tc => tc.id === cohort.id)
            ));

            setIsLoadingCohorts(false);
        } catch (error) {
            console.error("Error fetching cohorts:", error);
            setCohortError("Failed to load cohorts. Please try again later.");
            setIsLoadingCohorts(false);
        }
    };

    // Function to select a cohort
    const selectCohort = (cohort: any) => {
        // Check if already selected
        if (tempSelectedCohorts.some(c => c.id === cohort.id)) {
            return; // Already selected, do nothing
        }

        // Add to temporary selection
        setTempSelectedCohorts([...tempSelectedCohorts, cohort]);

        // Remove from filtered cohorts immediately for better UX
        setFilteredCohorts(prev => prev.filter(c => c.id !== cohort.id));
    };

    // Function to remove cohort from temporary selection
    const removeTempCohort = (cohortId: number) => {
        // Find the cohort to remove
        const cohortToRemove = tempSelectedCohorts.find(cohort => cohort.id === cohortId);

        // Remove from temp selection
        setTempSelectedCohorts(tempSelectedCohorts.filter(cohort => cohort.id !== cohortId));

        // Add back to filtered cohorts if it matches the current search
        if (cohortToRemove &&
            (cohortSearchQuery.trim() === '' ||
                cohortToRemove.name.toLowerCase().includes(cohortSearchQuery.toLowerCase()))) {
            setFilteredCohorts(prev => [...prev, cohortToRemove]);
        }
    };

    // Update to publish to all selected cohorts with a single API call
    const publishCourseToSelectedCohorts = async () => {
        if (tempSelectedCohorts.length === 0) {
            setShowPublishDialog(false);
            return;
        }

        try {
            setCohortError(null);

            // Show loading state
            setIsLoadingCohorts(true);

            // Extract all cohort IDs from the selected cohorts
            const cohortIds = tempSelectedCohorts.map(cohort => cohort.id);
            // Extract cohort names for the celebration banner
            const cohortNames = tempSelectedCohorts.map(cohort => cohort.name);

            // Link the course to the selected cohorts
            await linkCourseToCohorts(cohortIds, cohortNames);
        } catch (error) {
            console.error("Error publishing course:", error);
            setCohortError("Failed to publish course. Please try again later.");
        } finally {
            setIsLoadingCohorts(false);
        }
    };

    // Create a reusable function for linking a course to cohorts
    const linkCourseToCohorts = async (cohortIds: number[], cohortNames: string[]) => {
        // Make a single API call with all cohort IDs
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/courses/${courseId}/cohorts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                cohort_ids: cohortIds
            }),
        });

        // Check if the request failed
        if (!response.ok) {
            throw new Error(`Failed to link course to cohorts: ${response.status}`);
        }

        // Update cohort details for the celebration
        setCelebrationDetails({
            cohortCount: cohortIds.length,
            cohortNames: cohortNames
        });

        if (showPublishDialog) {
            setShowPublishDialog(false);
        }

        // Show the celebratory banner
        setShowCelebratoryBanner(true);

        // Reset selection
        setTempSelectedCohorts([]);

        // Refresh the displayed cohorts
        fetchCourseCohorts();
    };

    // Function to fetch cohorts assigned to this course
    const fetchCourseCohorts = async () => {
        try {
            setIsLoadingCourseCohorts(true);
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/courses/${courseId}/cohorts`);

            if (!response.ok) {
                throw new Error(`Failed to fetch course cohorts: ${response.status}`);
            }

            const data = await response.json();
            setCourseCohorts(data);
        } catch (error) {
            console.error("Error fetching course cohorts:", error);
            // Silently fail - don't show an error message to the user
        } finally {
            setIsLoadingCourseCohorts(false);
        }
    };

    // Add a new function to initiate cohort removal with confirmation
    const initiateCohortRemoval = (cohortId: number, cohortName: string) => {
        setCohortToRemove({ id: cohortId, name: cohortName });
        setShowRemoveCohortConfirmation(true);
    };

    // Modify the existing removeCohortFromCourse function to handle the actual removal
    const removeCohortFromCourse = async (cohortId: number) => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/courses/${courseId}/cohorts`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    cohort_ids: [cohortId]
                }),
            });

            if (!response.ok) {
                throw new Error(`Failed to remove cohort from course: ${response.status}`);
            }

            // Show success toast
            setToast({
                show: true,
                title: 'Cohort unlinked',
                description: `This course has been removed from "${cohortToRemove?.name}"`,
                emoji: '🔓'
            });

            // Auto-hide toast after 5 seconds
            setTimeout(() => {
                setToast(prev => ({ ...prev, show: false }));
            }, 5000);

            // Refresh the displayed cohorts
            fetchCourseCohorts();

            // Reset the confirmation state
            setShowRemoveCohortConfirmation(false);
            setCohortToRemove(null);
        } catch (error) {
            console.error("Error removing cohort from course:", error);

            // Show error toast
            setToast({
                show: true,
                title: 'Error',
                description: 'Failed to unlink cohort. Please try again.',
                emoji: '❌'
            });

            // Auto-hide toast after 5 seconds
            setTimeout(() => {
                setToast(prev => ({ ...prev, show: false }));
            }, 5000);

            // Reset the confirmation state even on error
            setShowRemoveCohortConfirmation(false);
            setCohortToRemove(null);
        }
    };

    // Add toast close handler
    const handleCloseToast = () => {
        setToast(prev => ({ ...prev, show: false }));
    };

    // Add handler for closing the celebratory banner
    const closeCelebratoryBanner = () => {
        setShowCelebratoryBanner(false);
    };

    // Update to handle dialog opening from either button
    const openCohortSelectionDialog = (origin: 'publish' | 'add') => {
        // Toggle dialog if clicking the same button that opened it
        if (showPublishDialog && dialogOrigin === origin) {
            // Close the dialog if it's already open with the same origin
            setShowPublishDialog(false);
            setDialogOrigin(null);
        } else {
            // Open the dialog with the new origin
            setDialogOrigin(origin);
            setShowPublishDialog(true);
            setTempSelectedCohorts([]); // Reset selected cohorts
            fetchCohorts();
        }
    };

    // Update to handle dialog closing
    const closeCohortDialog = () => {
        setShowPublishDialog(false);
        setDialogOrigin(null);
        setCohortSearchQuery('');
        setFilteredCohorts([]);
        setCohortError(null);
    };

    // Add handler for opening the create cohort dialog directly
    const openCreateCohortDialog = () => {
        // Close the cohort selection dialog first
        setShowPublishDialog(false);

        // Then open the create cohort dialog
        setShowCreateCohortDialog(true);
    };

    // Add handler for closing the create cohort dialog
    const closeCreateCohortDialog = () => {
        setShowCreateCohortDialog(false);
    };

    // Add handler for cohort creation and linking
    const handleCohortCreated = async (cohort: any) => {
        try {
            // Close the create cohort dialog first
            setShowCreateCohortDialog(false);

            // Link the course to the newly created cohort using the reusable function
            await linkCourseToCohorts([cohort.id], [cohort.name]);


        } catch (error) {
            console.error("Error linking course to cohort:", error);
            // Show error toast
            setToast({
                show: true,
                title: 'Error',
                description: 'Failed to link course to cohort. Please try again.',
                emoji: '❌'
            });

            // Auto-hide toast after 5 seconds
            setTimeout(() => {
                setToast(prev => ({ ...prev, show: false }));
            }, 5000);
        }
    };

    // Add useEffect for WebSocket cleanup
    useEffect(() => {
        // Cleanup function
        return () => {
            // Close WebSocket when component unmounts
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.close();
            }

            // Clear heartbeat interval
            if (heartbeatIntervalRef.current) {
                clearInterval(heartbeatIntervalRef.current);
            }
        };
    }, []);

    // Add a useEffect to watch for completion of task generation
    useEffect(() => {
        if (isGenerationComplete) {
            return;
        }

        // Check if all tasks have been generated
        if (totalTasksToGenerate > 0 && generatedTasksCount === totalTasksToGenerate) {
            // Add final completion message
            setGenerationProgress(["Course generation complete"]);

            // Set generation as complete
            setIsGenerationComplete(true);

            // Close WebSocket connection when all tasks are completed
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.close();
                wsRef.current = null;
            }
        }
    }, [generatedTasksCount, totalTasksToGenerate]);

    // Update the handleGenerationDone function to reset the isGenerationComplete state
    const handleGenerationDone = () => {
        setIsGeneratingCourse(false);
        setIsCourseStructureGenerated(false);
        setGenerationProgress([]);
        setGeneratedTasksCount(0);
        setTotalTasksToGenerate(0);
        setIsGenerationComplete(false);
    };

    const setupGenerationWebSocket = () => {
        // Set up WebSocket connection for real-time updates
        try {
            const websocketUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/^http/, 'ws')}/ws/course/${courseId}/generation`;
            console.log('Connecting to WebSocket at:', websocketUrl);

            // Create new WebSocket and store in ref
            wsRef.current = new WebSocket(websocketUrl);

            wsRef.current.onopen = () => {
                console.log('WebSocket connection established for course generation');

                // Set up heartbeat to keep connection alive
                // Typically sending a ping every 30 seconds prevents timeout
                heartbeatIntervalRef.current = setInterval(() => {
                    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                        // Send a simple ping message to keep the connection alive
                        wsRef.current.send(JSON.stringify({ type: 'ping' }));
                        console.log('Sent WebSocket heartbeat ping');
                    } else {
                        // Clear the interval if the WebSocket is closed
                        if (heartbeatIntervalRef.current) {
                            clearInterval(heartbeatIntervalRef.current);
                            heartbeatIntervalRef.current = null;
                        }
                    }
                }, 30000); // 30 seconds interval
            };

            wsRef.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('Received WebSocket message:', data);

                    if (data.event === 'module_created') {
                        // Add the new module to the list of modules
                        const newModule: Module = {
                            id: data.module.id.toString(),
                            title: data.module.name,
                            position: data.module.ordering,
                            backgroundColor: data.module.color,
                            isExpanded: true,
                            isEditing: false,
                            items: []
                        };

                        setModules(prevModules => [...prevModules, newModule]);
                    } else if (data.event === 'course_structure_completed') {
                        // Course structure generation is complete
                        const jobId = data.job_id;

                        setGenerationProgress(prev => [...prev, "Course plan complete", "Generating learning materials and quizzes"]);
                        setIsCourseStructureGenerated(true);
                        setGeneratedTasksCount(0); // Reset counter when starting task generation

                        // Now we can start the task generation
                        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/ai/generate/course/${courseId}/tasks`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                job_uuid: jobId
                            }),
                        }).then(response => {
                            if (!response.ok) {
                                throw new Error(`Failed to generate tasks: ${response.status}`);
                            }
                            return response.json();
                        }).catch(error => {
                            console.error('Error generating tasks:', error);
                            // Handle error appropriately
                            if (wsRef.current) {
                                wsRef.current.close();
                                wsRef.current = null;
                            }
                            setGenerationProgress(prev => [...prev, "Error generating tasks. Please try again."]);
                        });
                    } else if (data.event === 'task_created') {
                        // Increment the generated tasks counter
                        setTotalTasksToGenerate(prev => prev + 1);

                        // Add the new task to the appropriate module
                        setModules(prevModules => {
                            return prevModules.map(module => {
                                if (module.id === data.task.module_id.toString()) {
                                    // Create appropriate item based on type
                                    let newItem: ModuleItem;

                                    if (data.task.type === 'learning_material') {
                                        newItem = {
                                            id: data.task.id.toString(),
                                            title: data.task.name,
                                            position: data.task.ordering,
                                            type: 'material',
                                            content: [],
                                            status: 'draft',
                                            scheduled_publish_at: null,
                                            isGenerating: true
                                        } as LearningMaterial;
                                    } else if (data.task.type === 'quiz') {
                                        newItem = {
                                            id: data.task.id.toString(),
                                            title: data.task.name,
                                            position: data.task.ordering,
                                            type: 'quiz',
                                            questions: [],
                                            status: 'draft',
                                            scheduled_publish_at: null,
                                            isGenerating: true
                                        } as Quiz;
                                    } else {
                                        // Default to exam if type is not recognized
                                        newItem = {
                                            id: data.task.id.toString(),
                                            title: data.task.name,
                                            position: data.task.ordering,
                                            type: 'exam',
                                            questions: [],
                                            status: 'draft',
                                            scheduled_publish_at: null,
                                            isGenerating: true
                                        } as Exam;
                                    }

                                    return {
                                        ...module,
                                        items: [...module.items, newItem]
                                    };
                                }
                                return module;
                            });
                        });
                    } else if (data.event === 'task_completed') {
                        setGeneratedTasksCount(data.total_completed);

                        // Mark this specific task as no longer generating
                        const taskId = data.task.id.toString();

                        // Update the module item to remove the isGenerating flag
                        setModules(prevModules => {
                            return prevModules.map(module => {
                                // Update items in this module
                                const updatedItems = module.items.map(item => {
                                    if (item.id === taskId) {
                                        return {
                                            ...item,
                                            isGenerating: false
                                        };
                                    }
                                    return item;
                                });

                                return {
                                    ...module,
                                    items: updatedItems
                                };
                            });
                        });
                    }
                } catch (error) {
                    console.error('Error processing WebSocket message:', error);
                }
            };

            wsRef.current.onerror = (error) => {
                console.error('WebSocket error:', error);
                setGenerationProgress(prev => [...prev, "There was an error generating your course. Please try again."]);
            };

            wsRef.current.onclose = () => {
                console.log('WebSocket connection closed');

                // Clear heartbeat interval
                if (heartbeatIntervalRef.current) {
                    clearInterval(heartbeatIntervalRef.current);
                    heartbeatIntervalRef.current = null;
                }

                // Attempt to reconnect if generation is still in progress
                if (isGeneratingCourseRef.current &&
                    totalTasksToGenerateRef.current > 0 &&
                    generatedTasksCountRef.current < totalTasksToGenerateRef.current) {

                    console.log('Generation still in progress. Attempting to reconnect...');
                    // Add a small delay before attempting to reconnect
                    setTimeout(() => {
                        // Try to setup a new WebSocket connection
                        const ws = setupGenerationWebSocket();
                        if (ws) {
                            wsRef.current = ws;
                            console.log('WebSocket reconnection successful');
                        } else {
                            console.error('WebSocket reconnection failed');
                        }
                    }, 500); // small delay before reconnection attempt
                }
            };

            return wsRef.current;
        } catch (wsError) {
            console.error('Error setting up WebSocket:', wsError);
        }
    }


    // Add handler for AI course generation
    const handleGenerateCourse = async (data: GenerateWithAIFormData) => {
        if (!data.referencePdf) {
            throw new Error('Reference material is required');
        }

        try {
            // Close the dialog first
            setShowGenerateDialog(false);

            // Set generating state and initialize with first progress message
            setIsGeneratingCourse(true);
            setIsCourseStructureGenerated(false);
            setIsGenerationComplete(false); // Reset completion state

            // Clear any existing WebSocket connection
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }

            // Clear any existing heartbeat interval
            if (heartbeatIntervalRef.current) {
                clearInterval(heartbeatIntervalRef.current);
                heartbeatIntervalRef.current = null;
            }

            // For now, we'll just log the data
            // In a real implementation, this would be an API call to start the generation process
            console.log('Generate course with AI:', data);

            let presigned_url = '';
            let file_key = '';

            setGenerationProgress(["Uploading reference material"]);

            try {
                // First, get a presigned URL for the file
                const presignedUrlResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/file/presigned-url/create`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        content_type: 'application/pdf'
                    })
                });

                if (!presignedUrlResponse.ok) {
                    throw new Error('Failed to get presigned URL');
                }

                const presignedData = await presignedUrlResponse.json();

                console.log('Presigned url generated');
                presigned_url = presignedData.presigned_url;
                file_key = presignedData.file_key;

            } catch (error) {
                console.error("Error getting presigned URL for file:", error);
            }

            if (!presigned_url) {
                // If we couldn't get a presigned URL, try direct upload to the backend
                try {
                    console.log("Attempting direct upload to backend");

                    // Create FormData for the file upload
                    const formData = new FormData();
                    formData.append('file', data.referencePdf, 'reference_material.pdf');
                    formData.append('content_type', 'application/pdf');

                    // Upload directly to the backend
                    const uploadResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/file/upload-local`, {
                        method: 'POST',
                        body: formData
                    });

                    if (!uploadResponse.ok) {
                        throw new Error(`Failed to upload audio to backend: ${uploadResponse.status}`);
                    }

                    const uploadData = await uploadResponse.json();
                    file_key = uploadData.file_key;

                    console.log('Reference material uploaded successfully to backend');
                } catch (error) {
                    console.error('Error with direct upload to backend:', error);
                    throw error;
                }
            } else {

                // Upload the file to S3 using the presigned URL
                try {
                    // Use data.referencePdf instead of undefined 'file' variable
                    const pdfFile = data.referencePdf;

                    // Upload to S3 using the presigned URL
                    const uploadResponse = await fetch(presigned_url, {
                        method: 'PUT',
                        body: pdfFile, // Use the file directly, no need to create a Blob
                        headers: {
                            'Content-Type': 'application/pdf'
                        }
                    });

                    if (!uploadResponse.ok) {
                        throw new Error(`Failed to upload file to S3: ${uploadResponse.status}`);
                    }

                    console.log('File uploaded successfully to S3');
                    console.log(uploadResponse);
                } catch (error) {
                    console.error('Error uploading file to S3:', error);
                    throw error;
                }
            }

            setGenerationProgress(["Uploaded reference material", 'Generating course plan']);

            // Set up WebSocket connection for real-time updates
            const ws = setupGenerationWebSocket()

            if (!ws) {
                throw new Error('Failed to setup WebSocket connection');
            }

            wsRef.current = ws;

            let jobId = '';

            // Make API request to generate course structure
            try {
                let response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/ai/generate/course/${courseId}/structure`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        course_description: data.courseDescription,
                        intended_audience: data.intendedAudience,
                        instructions: data.instructionsForAI || undefined,
                        reference_material_s3_key: file_key
                    }),
                });

                console.log('1')

                if (!response.ok) {
                    // Close WebSocket on API error
                    if (wsRef.current) {
                        wsRef.current.close();
                        wsRef.current = null;
                    }
                    throw new Error(`Failed to generate course: ${response.status}`);
                }

                console.log('2')

                const result = await response.json();
                console.log('Course generation initiated successfully:', result);

                // We'll set a listener for the course structure completion
                // instead of immediately setting it as complete

                // Wait for the WebSocket to notify that the course structure is complete
                // Instead of immediately calling the tasks endpoint
            } catch (error) {
                console.error('Error making course generation API request:', error);
                // Close WebSocket on API error
                if (wsRef.current) {
                    wsRef.current.close();
                    wsRef.current = null;
                }
                throw error;
            }
        } catch (error) {
            console.error('Error generating course:', error);

            // Clean up WebSocket
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }

            // Clear heartbeat interval
            if (heartbeatIntervalRef.current) {
                clearInterval(heartbeatIntervalRef.current);
                heartbeatIntervalRef.current = null;
            }

            // Add error message to progress
            setGenerationProgress(prev => [...prev, "There was an error generating your course. Please try again."]);

            // Reset generating state after delay
            setTimeout(() => {
                setIsGeneratingCourse(false);
                setIsCourseStructureGenerated(false);
                setGenerationProgress([]);
            }, 3000);

            return Promise.reject(error);
        }
    };

    return (
        <div className="min-h-screen bg-black">
            {/* Use the reusable Header component with showCreateCourseButton set to false */}
            <Header showCreateCourseButton={false} />

            {/* Add overlay when course is being generated */}
            {isGeneratingCourse && !isCourseStructureGenerated && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-[1px] z-40 flex items-center justify-center pointer-events-auto">

                </div>
            )}

            {/* Show spinner when loading */}
            {isLoading ? (
                <div className="flex justify-center items-center h-[calc(100vh-80px)]">
                    <div className="w-16 h-16 border-t-2 border-b-2 border-white rounded-full animate-spin"></div>
                </div>
            ) : (
                /* Main content area - only shown after loading */
                <div className="py-12 grid grid-cols-5 gap-6">
                    <div className="max-w-5xl ml-24 col-span-4 relative">
                        {/* Back to Courses button */}
                        <Link
                            href={`/school/admin/${schoolId}#courses`}
                            className="flex items-center text-gray-400 hover:text-white transition-colors mb-4"
                        >
                            <ArrowLeft size={16} className="mr-2 text-sm" />
                            Back To Courses
                        </Link>

                        <div className="flex items-center justify-between mb-8">
                            {error ? (
                                <h1 className="text-4xl font-light text-red-400 w-3/4 mr-8">
                                    {error}
                                </h1>
                            ) : (
                                <div className="flex items-center w-3/4 mr-8">
                                    <h1
                                        ref={titleRef}
                                        contentEditable={isCourseTitleEditing}
                                        suppressContentEditableWarning
                                        onInput={handleCourseTitleInput}
                                        onKeyDown={handleKeyDown}
                                        className={`text-4xl font-light text-white outline-none ${isCourseTitleEditing ? 'border-b border-gray-700 pb-1' : ''}`}
                                        autoFocus={isCourseTitleEditing}
                                    >
                                        {courseTitle}
                                    </h1>

                                    {/* Add published pill when course is in at least one cohort */}
                                    {!isCourseTitleEditing && courseCohorts.length > 0 && (
                                        <div className="ml-4 px-3 py-1 bg-green-800/70 text-white text-xs rounded-full">
                                            Published
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex items-center space-x-3 ml-auto">
                                {isCourseTitleEditing ? (
                                    <>
                                        <button
                                            className="flex items-center px-6 py-2 text-sm font-medium text-white bg-transparent border-2 !border-[#4F46E5] hover:bg-[#222222] outline-none rounded-full transition-all cursor-pointer shadow-md"
                                            onClick={saveCourseTitle}
                                        >
                                            <span className="mr-2 text-base">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                                    <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                                    <polyline points="7 3 7 8 15 8"></polyline>
                                                </svg>
                                            </span>
                                            <span className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">Save</span>
                                        </button>
                                        <button
                                            className="flex items-center px-6 py-2 text-sm font-medium text-white bg-transparent border-2 !border-[#6B7280] hover:bg-[#222222] outline-none rounded-full transition-all cursor-pointer shadow-md"
                                            onClick={cancelCourseTitleEditing}
                                        >
                                            <span className="mr-2 text-base">
                                                <X size={16} />
                                            </span>
                                            <span className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">Cancel</span>
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            className="flex items-center px-6 py-2 text-sm font-medium text-white bg-transparent border-2 !border-[#4F46E5] hover:bg-[#222222] outline-none rounded-full transition-all cursor-pointer shadow-md"
                                            onClick={enableCourseTitleEditing}
                                        >
                                            <span className="mr-2 text-base">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                </svg>
                                            </span>
                                            <span className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">Edit</span>
                                        </button>
                                        <button
                                            className="flex items-center px-6 py-2 text-sm font-medium text-white bg-transparent border-2 !border-[#EF4444] hover:bg-[#222222] outline-none rounded-full transition-all cursor-pointer shadow-md"
                                            onClick={() => {
                                                // Open preview in a new tab
                                                window.open(`/school/admin/${schoolId}/courses/${courseId}/preview`, '_blank');
                                            }}
                                        >
                                            <span className="mr-2 text-base">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                                    <circle cx="12" cy="12" r="3"></circle>
                                                </svg>
                                            </span>
                                            <span className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">Preview</span>
                                        </button>
                                        {hasAnyItems() && courseCohorts.length === 0 && (
                                            <div className="relative">
                                                <button
                                                    ref={publishButtonRef}
                                                    data-dropdown-toggle="true"
                                                    className="flex items-center px-6 py-2 text-sm font-medium text-white bg-[#016037] border-0 hover:bg-[#017045] outline-none rounded-full transition-all cursor-pointer shadow-md"
                                                    onClick={() => openCohortSelectionDialog('publish')}
                                                >
                                                    <span className="mr-2 text-base">🚀</span>
                                                    <span className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">Publish</span>
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={() => addModule(courseId, schoolId, modules, setModules, setActiveModuleId, lastUsedColorIndex, setLastUsedColorIndex)}
                            className="mb-6 px-6 py-2 bg-white text-black text-sm font-medium rounded-full hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-100 cursor-pointer"
                        >
                            Add Module
                        </button>

                        <CourseModuleList
                            modules={modules}
                            mode="edit"
                            onToggleModule={toggleModule}
                            onOpenItem={openItemDialog}
                            onMoveItemUp={moveItemUp}
                            onMoveItemDown={moveItemDown}
                            onDeleteItem={deleteItem}
                            onAddLearningMaterial={addLearningMaterial}
                            onAddQuiz={addQuiz}
                            onAddExam={addExam}
                            onMoveModuleUp={moveModuleUp}
                            onMoveModuleDown={moveModuleDown}
                            onDeleteModule={deleteModule}
                            onEditModuleTitle={enableModuleEditing}
                            saveModuleTitle={saveModuleTitle}
                            cancelModuleEditing={cancelModuleEditing}
                            isDialogOpen={isDialogOpen}
                            activeItem={activeItem}
                            activeModuleId={activeModuleId}
                            isEditMode={isEditMode}
                            isPreviewMode={isPreviewMode}
                            showPublishConfirmation={showPublishConfirmation}
                            handleConfirmPublish={handleConfirmPublish}
                            handleCancelPublish={handleCancelPublish}
                            closeDialog={closeDialog}
                            saveItem={saveItem}
                            cancelEditMode={cancelEditMode}
                            enableEditMode={enableEditMode}
                            handleDialogTitleChange={handleDialogTitleChange}
                            handleQuizContentChange={handleQuizContentChange}
                            setShowPublishConfirmation={setShowPublishConfirmation}
                            schoolId={schoolId}
                            courseId={courseId}
                        />
                    </div>

                    {/* Display cohorts assigned to this course */}
                    {!isLoadingCourseCohorts && courseCohorts.length > 0 && (
                        <div>
                            <div className="relative">
                                <button
                                    ref={addCohortButtonRef}
                                    data-dropdown-toggle="true"
                                    className="flex items-center px-6 py-2 text-sm font-medium text-white bg-[#016037] border-0 hover:bg-[#017045] outline-none rounded-full transition-all cursor-pointer shadow-md"
                                    onClick={() => openCohortSelectionDialog('add')}
                                >
                                    <span className="mr-2 text-base"><UsersRound size={16} /></span>
                                    <span className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">Add to Cohorts</span>
                                </button>
                            </div>
                            <div className="mt-10">
                                <h2 className="text-sm font-light text-gray-400 mb-3 ">Cohorts</h2>
                                <div className="flex flex-wrap gap-3">
                                    {courseCohorts.map((cohort: { id: number; name: string }) => (
                                        <div
                                            key={cohort.id}
                                            className="flex items-center bg-[#222] px-4 py-2 rounded-full group hover:bg-[#333] transition-colors"
                                        >
                                            <Tooltip content="Open" position="top">
                                                <button
                                                    onClick={() => window.open(`/school/admin/${schoolId}/cohorts/${cohort.id}`, '_blank')}
                                                    className="text-gray-400 hover:text-white cursor-pointer flex items-center mr-2"
                                                    aria-label="Open cohort page"
                                                >
                                                    <ExternalLink size={16} />
                                                </button>
                                            </Tooltip>
                                            <span className="text-white text-sm font-light">{cohort.name}</span>
                                            <Tooltip content="Remove" position="top">
                                                <button
                                                    onClick={() => initiateCohortRemoval(cohort.id, cohort.name)}
                                                    className="text-gray-400 hover:text-white cursor-pointer flex items-center ml-2"
                                                    aria-label="Remove cohort from course"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </Tooltip>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Generation Progress Window */}
            {isGeneratingCourse && (
                <div className="fixed bottom-4 right-4 z-50 w-72 bg-black border border-gray-800 rounded-xl shadow-lg overflow-hidden">
                    <div className="px-5 py-3 bg-[#111111] border-b border-gray-800 flex justify-between items-center">
                        <div className="flex items-center">
                            <Sparkles size={16} className="text-white mr-2" />
                            <h3 className="text-white text-sm font-light">AI Course Generation</h3>
                        </div>
                    </div>
                    <div className="p-5 max-h-60 overflow-y-auto space-y-4">
                        {generationProgress.map((message, index) => {
                            const isLatest = index === generationProgress.length - 1;

                            // Show spinner only for latest message when generation is not complete
                            const showSpinner = isLatest && !isGenerationComplete;

                            return (
                                <div key={index} className="flex items-center text-sm">
                                    <div className="flex-shrink-0 mr-3">
                                        {showSpinner ? (
                                            <div className="h-5 w-5 flex items-center justify-center">
                                                <Loader2 className="h-4 w-4 animate-spin text-white" />
                                            </div>
                                        ) : (
                                            <div className="h-5 w-5 flex items-center justify-center">
                                                <Check className="h-3 w-3 text-white" />
                                            </div>
                                        )}
                                    </div>
                                    <div className={`text-${isLatest ? 'white' : 'gray-400'} font-light`}>
                                        {message}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Task generation progress bar - only shown after course structure is generated */}
                        {isCourseStructureGenerated && totalTasksToGenerate > 0 && !isGenerationComplete && (
                            <div className="mt-2">
                                <div className="flex justify-between text-xs text-gray-400 mb-1">
                                    <span>{generatedTasksCount} / {totalTasksToGenerate}</span>
                                </div>
                                <div className="w-full bg-gray-800 rounded-full h-2.5">
                                    <div
                                        className="bg-green-600 h-2.5 rounded-full transition-all duration-300 ease-in-out"
                                        style={{ width: `${Math.min(100, (generatedTasksCount / totalTasksToGenerate) * 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        )}


                    </div>
                    {/* Done button - only shown when generation is complete */}
                    {isGenerationComplete && (
                        <div className="mb-4 flex justify-center">
                            <button
                                onClick={handleGenerationDone}
                                className="px-6 py-2 bg-white text-black text-sm font-medium rounded-full hover:opacity-90 transition-opacity focus:outline-none cursor-pointer"
                            >
                                Done
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Floating Action Button - Generate with AI - only shown when not generating */}
            <div className="fixed bottom-10 right-10 z-50">
                {!isGeneratingCourse && !toast.show && !isDialogOpen && (
                    <button
                        className="flex items-center px-6 py-3 bg-white text-black text-sm font-medium rounded-full hover:opacity-90 transition-opacity shadow-lg cursor-pointer"
                        onClick={() => setShowGenerateDialog(true)}
                        disabled={isGeneratingCourse}
                    >
                        <span className="mr-2">
                            <Sparkles size={18} />
                        </span>
                        <span>Generate with AI</span>
                    </button>
                )}
            </div>

            {/* Render the CourseCohortSelectionDialog */}
            <CourseCohortSelectionDialog
                isOpen={showPublishDialog}
                onClose={closeCohortDialog}
                originButtonRef={dialogOrigin === 'publish' ? publishButtonRef : addCohortButtonRef}
                isPublishing={dialogOrigin === 'publish'}
                onConfirm={publishCourseToSelectedCohorts}
                showLoading={isLoadingCohorts}
                hasError={!!cohortError}
                errorMessage={cohortError || ''}
                onRetry={fetchCohorts}
                cohorts={cohorts}
                tempSelectedCohorts={tempSelectedCohorts}
                onRemoveCohort={removeTempCohort}
                onSelectCohort={selectCohort}
                onSearchChange={handleCohortSearch}
                searchQuery={cohortSearchQuery}
                filteredCohorts={filteredCohorts}
                totalSchoolCohorts={totalSchoolCohorts}
                schoolId={schoolId}
                courseId={courseId}
                onCohortCreated={handleCohortCreated}
                onOpenCreateCohortDialog={openCreateCohortDialog}
            />

            {/* Confirmation Dialog for Cohort Removal */}
            <ConfirmationDialog
                open={showRemoveCohortConfirmation}
                title="Remove Course From Cohort"
                message={`Are you sure you want to remove this course from "${cohortToRemove?.name}"? Learners in that cohort will no longer have access to this course`}
                onConfirm={() => cohortToRemove && removeCohortFromCourse(cohortToRemove.id)}
                onCancel={() => {
                    setShowRemoveCohortConfirmation(false);
                    setCohortToRemove(null);
                }}
                confirmButtonText="Remove"
                type="delete"
            />

            {/* Toast notification */}
            <Toast
                show={toast.show}
                title={toast.title}
                description={toast.description}
                emoji={toast.emoji}
                onClose={handleCloseToast}
            />

            {/* Celebratory Banner for course publication */}
            <CoursePublishSuccessBanner
                isOpen={showCelebratoryBanner}
                onClose={closeCelebratoryBanner}
                cohortCount={celebrationDetails.cohortCount}
                cohortNames={celebrationDetails.cohortNames}
            />

            {/* Add the standalone CreateCohortDialog */}
            <CreateCohortDialog
                open={showCreateCohortDialog}
                onClose={closeCreateCohortDialog}
                onCreateCohort={handleCohortCreated}
                schoolId={schoolId}
            />

            {/* Generate with AI Dialog */}
            <GenerateWithAIDialog
                open={showGenerateDialog}
                onClose={() => setShowGenerateDialog(false)}
                onSubmit={handleGenerateCourse}
            />
        </div>
    );
}