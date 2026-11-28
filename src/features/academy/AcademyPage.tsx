import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Download,
  ExternalLink,
  FileText,
  Filter,
  GraduationCap,
  Layers,
  PlayCircle,
  Presentation,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Video,
} from 'lucide-react';
import {
  getCourses,
  handleCoverImageError,
  resolveCoverOrLogo,
  resolveMediaUrl,
  type CatalogCourse,
  type CourseAttachment,
  type CourseLessonItem,
} from '../../core/data/catalogService.ts';
import { useTranslation } from '../../core/i18n/index.ts';
import { sanitizeHtmlContent } from '../../core/utils/sanitize.ts';
import { useSEO } from '../../core/seo/useSEO.ts';
import { callUserAI } from '../ai/userAIService.ts';
import {
  claimArticleReadReward,
  DEFAULT_RESOURCE_UNLOCK_COST,
  getPointsState,
  isItemUnlocked,
  unlockItemWithPoints,
} from '../game/vneGameService.ts';

const ENROLL_STORAGE_KEY = 'vne_enrolled_courses';
const LESSON_PROGRESS_KEY = 'vne_course_lesson_progress';

type CourseFilter = 'all' | 'blockchain' | 'economics_marketing' | 'enrolled';
type CourseSort = 'students_desc' | 'lessons_desc' | 'title_az';
type StageMode = 'video' | 'document' | 'exam';
type BottomTab = 'overview' | 'files' | 'reviews' | 'ai';

function getEnrolledSlugs(): string[] {
  try {
    return JSON.parse(localStorage.getItem(ENROLL_STORAGE_KEY) || '[]') as string[];
  } catch {
    return [];
  }
}

function getCompletedLessonMap(): Record<string, number[]> {
  try {
    return JSON.parse(localStorage.getItem(LESSON_PROGRESS_KEY) || '{}') as Record<string, number[]>;
  } catch {
    return {};
  }
}

function getCourseTopic(course: CatalogCourse): 'blockchain' | 'economics_marketing' {
  const t = course.title.toLowerCase();
  if (t.includes('blockchain') || t.includes('cardano') || t.includes('bitcoin') || t.includes('plutus')) {
    return 'blockchain';
  }
  return 'economics_marketing';
}

function getViewerUrl(att: CourseAttachment): string {
  const rawUrl = resolveMediaUrl(att.url) || att.url;
  const fullUrl = rawUrl.startsWith('http') ? rawUrl : `https://vneconomics.com${rawUrl}`;
  if (att.file_type === 'ppt' || att.file_type === 'pptx' || att.file_type === 'docx' || att.file_type === 'xlsx') {
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fullUrl)}`;
  }
  return fullUrl;
}

export const AcademyPage: React.FC = () => {
  const { slug } = useParams<{ slug?: string }>();
  const { lang, isEn } = useTranslation();
  const courses = getCourses(lang);
  const activeCourse = slug ? courses.find((c) => c.slug === slug) : undefined;

  const [enrolled, setEnrolled] = useState<string[]>(() => getEnrolledSlugs());
  const [, setUnlockVersion] = useState(0);
  const [unlockNotice, setUnlockNotice] = useState<{ ok: boolean; msg: string } | null>(null);
  const [completedMap, setCompletedMap] = useState<Record<string, number[]>>(() => getCompletedLessonMap());

  const [topicFilter, setTopicFilter] = useState<CourseFilter>('all');
  const [sortBy, setSortBy] = useState<CourseSort>('students_desc');
  const [query, setQuery] = useState('');

  // Classroom state
  const [stageMode, setStageMode] = useState<StageMode>('video');
  const [bottomTab, setBottomTab] = useState<BottomTab>('overview');
  const [activeLessonId, setActiveLessonId] = useState<number | null>(null);
  const [activeVideoIdx, setActiveVideoIdx] = useState(0);
  const [activeFileIdx, setActiveFileIdx] = useState(0);
  const [openSections, setOpenSections] = useState<Record<number, boolean>>({});
  const [lessonNotice, setLessonNotice] = useState('');

  const [aiNote, setAiNote] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [lessonNotesMap, setLessonNotesMap] = useState<Record<number, string>>({});

  const allLessons: Array<CourseLessonItem & { sectionTitle: string }> = useMemo(() => {
    if (!activeCourse?.sections) return [];
    const flat: Array<CourseLessonItem & { sectionTitle: string }> = [];
    for (const sec of activeCourse.sections) {
      for (const item of sec.items) {
        flat.push({ ...item, sectionTitle: sec.title });
      }
    }
    return flat;
  }, [activeCourse]);

  useEffect(() => {
    if (!activeCourse) return;
    setActiveVideoIdx(0);
    setActiveFileIdx(0);
    setLessonNotice('');
    setAiNote('');
    setAiError('');

    const defaultOpen: Record<number, boolean> = {};
    activeCourse.sections?.forEach((sec, i) => {
      defaultOpen[sec.id] = i < 2;
    });
    setOpenSections(defaultOpen);

    if (allLessons.length > 0) {
      setActiveLessonId(allLessons[0].id);
    } else {
      setActiveLessonId(null);
    }

    const hasVideos =
      (activeCourse.youtube_videos?.length || 0) > 0 ||
      allLessons.some((l) => Boolean(l.youtube_embed_url));
    const hasFiles = (activeCourse.attachments?.length || 0) > 0;
    if (hasVideos) setStageMode('video');
    else if (hasFiles) setStageMode('document');
    else setStageMode('exam');

    let cancelled = false;
    setLessonNotesMap({});
    fetch(`/course-lessons/${activeCourse.slug}.${lang}.json`)
      .then((res) => (res.ok ? res.json() : {}))
      .then((map) => {
        if (!cancelled && map && typeof map === 'object') {
          setLessonNotesMap(map as Record<number, string>);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [activeCourse, allLessons, lang]);

  const enrollCourse = (courseSlug: string) => {
    if (enrolled.includes(courseSlug)) return;
    const next = [...enrolled, courseSlug];
    setEnrolled(next);
    try {
      localStorage.setItem(ENROLL_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore
    }
  };

  const toggleLessonComplete = (courseSlug: string, lesson: CourseLessonItem) => {
    enrollCourse(courseSlug);
    const current = completedMap[courseSlug] || [];
    if (current.includes(lesson.id)) {
      setLessonNotice(
        isEn
          ? `Lesson "${lesson.title}" was already marked complete.`
          : `Bài "${lesson.title}" đã được đánh dấu hoàn thành trước đó.`,
      );
      return;
    }
    const nextMap = { ...completedMap, [courseSlug]: [...current, lesson.id] };
    setCompletedMap(nextMap);
    try {
      localStorage.setItem(LESSON_PROGRESS_KEY, JSON.stringify(nextMap));
    } catch {
      // Ignore
    }
    const res = claimArticleReadReward(`course_${courseSlug}_lesson_${lesson.id}`, lesson.title);
    setLessonNotice(
      res.ok
        ? isEn
          ? `Completed "${lesson.title}" (+10 VNE Points)!`
          : `Hoàn thành "${lesson.title}" (+10 VNE Points)!`
        : isEn
          ? `Completion saved for "${lesson.title}".`
          : `Đã lưu hoàn thành "${lesson.title}".`,
    );
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = courses.filter((c) => {
      if (topicFilter === 'enrolled' && !enrolled.includes(c.slug)) return false;
      if (topicFilter === 'blockchain' && getCourseTopic(c) !== 'blockchain') return false;
      if (topicFilter === 'economics_marketing' && getCourseTopic(c) !== 'economics_marketing') return false;
      if (!q) return true;
      return c.title.toLowerCase().includes(q) || (c.instructor_name || '').toLowerCase().includes(q);
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'lessons_desc') return (b.lessons_count || 0) - (a.lessons_count || 0);
      if (sortBy === 'title_az') return a.title.localeCompare(b.title, lang);
      return b.students_count - a.students_count;
    });
  }, [courses, topicFilter, sortBy, query, enrolled, lang]);

  useSEO({
    title: activeCourse
      ? isEn
        ? `${activeCourse.title} | VNEconomics Digital Classroom`
        : `${activeCourse.title} | Lớp học Số VNEconomics`
      : isEn
        ? `Digital Courses Academy (${courses.length} Free Courses + YouTube, PDF/PPT & NFT Cert) | VNEconomics`
        : `Sàn Khóa học Số (${courses.length} Khóa học 0đ + Video YouTube, PDF/PPT & Chứng chỉ NFT) | VNEconomics`,
    description: isEn
      ? 'Digital Economy, Cardano Blockchain, Plutus, MIT/Princeton & Digital Marketing courses with YouTube video lectures, PDF/PPT decks, and Testnet NFT Certificate exams.'
      : 'Hệ thống khóa học Kinh tế số, Blockchain Cardano, Plutus, MIT/Princeton và Digital Marketing với video YouTube, slide PPT/PDF và bài thi lấy chứng chỉ NFT Testnet.',
    canonicalPath: activeCourse ? `/course/${activeCourse.slug}/` : '/hoc-vien/',
  });

  // ============================================================================
  // LMS CLASSROOM VIEW (/course/:slug/)
  // ============================================================================
  if (slug && activeCourse) {
    const courseCost = DEFAULT_RESOURCE_UNLOCK_COST;
    const courseUnlocked = isItemUnlocked(`course:${activeCourse.slug}`);
    const userPoints = getPointsState().totalPoints;
    const isEnrolled = enrolled.includes(activeCourse.slug);
    const completedIds = completedMap[activeCourse.slug] || [];
    const totalLessons = allLessons.length;
    const progressPct = totalLessons > 0 ? Math.min(100, Math.round((completedIds.length / totalLessons) * 100)) : 0;

    const currentIdx = allLessons.findIndex((l) => l.id === activeLessonId);
    const activeLesson = currentIdx >= 0 ? allLessons[currentIdx] : undefined;

    const videos = activeCourse.youtube_videos || [];
    const attachments = activeCourse.attachments || [];
    const activeVideo = videos[activeVideoIdx];
    const activeAttachment = attachments[activeFileIdx];
    const activeVideoEmbedUrl = activeLesson?.youtube_embed_url || activeVideo?.embed_url;
    const activeVideoTitle = activeLesson?.youtube_embed_url
      ? activeLesson.title
      : activeVideo?.title || activeCourse.title;
    const rawLessonHtml = activeLesson
      ? lessonNotesMap[activeLesson.id] || activeLesson.content_html || ''
      : '';
    const activeLessonNotesHtml = rawLessonHtml
      ? rawLessonHtml.replace(/<iframe[\s\S]*?<\/iframe>/gi, '').trim()
      : '';

    const handleAskAiLesson = async (mode: 'summary' | 'quiz') => {
      setAiLoading(true);
      setAiError('');
      setAiNote('');
      const targetTitle = activeLesson
        ? isEn
          ? `${activeCourse.title} — Lesson: ${activeLesson.title}`
          : `${activeCourse.title} — Bài: ${activeLesson.title}`
        : activeCourse.title;
      try {
        const reply = await callUserAI({
          prompt: isEn
            ? mode === 'summary'
              ? `Create a focused 5-bullet outline and key concepts to remember for this lesson in English: "${targetTitle}".`
              : `Create 5 multiple-choice review questions with concise answer explanations in English for this lesson: "${targetTitle}".`
            : mode === 'summary'
              ? `Hãy lập dàn ý trọng tâm (5 gạch đầu dòng) và các khái niệm cần nhớ cho bài học: "${targetTitle}".`
              : `Hãy tạo 5 câu hỏi trắc nghiệm ôn tập kèm đáp án giải thích ngắn gọn cho bài học: "${targetTitle}".`,
        });
        setAiNote(reply);
      } catch (err) {
        setAiError(
          err instanceof Error
            ? err.message
            : isEn
              ? 'Please configure your personal AI Key in AI Lab.'
              : 'Vui lòng nhập AI Key tại AI Lab.',
        );
      } finally {
        setAiLoading(false);
      }
    };

    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top Classroom Breadcrumb */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to="/hoc-vien/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-paper-300 dark:border-ink-700 bg-paper-50 dark:bg-ink-900 text-xs font-semibold hover:border-[#146EBE] shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> {isEn ? 'All Courses' : 'Tất cả Khóa học'}
            </Link>
            <div className="text-xs text-ink-500 truncate">
              {isEn ? 'Instructor: ' : 'Giảng viên: '}
              <strong className="text-ink-900 dark:text-paper-100">{activeCourse.instructor_name}</strong>
              {activeCourse.duration_label
                ? isEn
                  ? ` • Duration: ${activeCourse.duration_label}`
                  : ` • Thời lượng: ${activeCourse.duration_label}`
                : ''}
              {` • ${activeCourse.students_count} ${isEn ? 'learners' : 'học viên'}`}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs tabular-nums">
            <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold">
              {isEn ? 'Progress: ' : 'Tiến độ: '}
              {completedIds.length}/{totalLessons || 1} ({progressPct}%)
            </span>
            <button
              type="button"
              onClick={() => {
                if (courseUnlocked) {
                  enrollCourse(activeCourse.slug);
                  return;
                }
                const res = unlockItemWithPoints(`course:${activeCourse.slug}`, courseCost, activeCourse.title);
                setUnlockNotice({ ok: res.ok, msg: res.message });
                if (res.ok) {
                  enrollCourse(activeCourse.slug);
                  setUnlockVersion((v) => v + 1);
                }
              }}
              className="px-3.5 py-1.5 rounded-lg bg-[#146EBE] text-white font-bold"
            >
              {isEn
                ? courseUnlocked
                  ? isEnrolled
                    ? 'Unlocked & Enrolled'
                    : 'Unlocked • Enroll'
                  : `Unlock Course (${courseCost} VNE)`
                : courseUnlocked
                  ? isEnrolled
                    ? 'Đã mở khóa & Ghi danh'
                    : 'Đã mở khóa • Ghi danh'
                  : `Mở khóa (${courseCost} VNE)`}
            </button>
          </div>
        </div>

        {/* Course Unlock Gate if not unlocked with VNE Points */}
        {!courseUnlocked ? (
          <div className="rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/30 p-6 sm:p-10 text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-800 dark:text-amber-300 text-xs font-bold">
              <Award className="w-4 h-4" />
              {isEn
                ? `Requires ${courseCost} VNE Points • Your Balance: ${userPoints} VNE`
                : `Cần ${courseCost} VNE Points • Số dư hiện tại: ${userPoints} VNE`}
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink-950 dark:text-paper-50">
              {activeCourse.title}
            </h1>
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-semibold text-ink-600 dark:text-ink-300">
              <span className="inline-flex items-center gap-1">
                <Users className="w-4 h-4 text-[#146EBE]" />
                {activeCourse.students_count} {isEn ? 'enrolled learners (vneconomics.com)' : 'học viên thực tế (vneconomics.com)'}
              </span>
              {((activeCourse.comments?.length || 0) + (activeCourse.reviews?.length || 0)) > 0 && (
                <span>
                  • {(activeCourse.comments?.length || 0) + (activeCourse.reviews?.length || 0)}{' '}
                  {isEn ? 'legacy comments/reviews' : 'bình luận & đánh giá cũ'}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-ink-600 dark:text-ink-300 max-w-2xl mx-auto">
              {isEn
                ? 'Unlock this course with VNE Points to access all video lectures, PDF/PPT slides, and the NFT certificate exam. Default balance is 10 VNE (resets to 100 VNE daily); register an account and practice to earn more!'
                : 'Mở khóa khóa học bằng VNE Points để xem toàn bộ bài giảng video, slide PDF/PPT và làm bài thi chứng chỉ NFT. Mặc định bạn có 10 VNE (tự động reset 100 VNE mỗi ngày); đăng ký tài khoản & luyện tập để kiếm thêm VNE vào ví!'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const res = unlockItemWithPoints(`course:${activeCourse.slug}`, courseCost, activeCourse.title);
                  setUnlockNotice({ ok: res.ok, msg: res.message });
                  if (res.ok) {
                    enrollCourse(activeCourse.slug);
                    setUnlockVersion((v) => v + 1);
                  }
                }}
                className="px-6 py-3 rounded-xl bg-[#146EBE] hover:bg-[#0f5ba0] text-white text-sm font-bold shadow-sm"
              >
                {isEn ? `Unlock Course Now (${courseCost} VNE Points)` : `Mở khóa khóa học ngay (${courseCost} VNE Points)`}
              </button>
              <Link
                to="/luyen-tap/"
                className="px-5 py-3 rounded-xl border border-paper-300 dark:border-ink-700 bg-paper-50 dark:bg-ink-900 text-sm font-semibold hover:border-[#146EBE]"
              >
                {isEn ? 'Practice for VNE' : 'Luyện tập kiếm VNE'}
              </Link>
              <Link
                to="/tai-khoan/"
                className="px-5 py-3 rounded-xl border border-paper-300 dark:border-ink-700 bg-paper-50 dark:bg-ink-900 text-sm font-semibold hover:border-[#146EBE]"
              >
                {isEn ? 'Register Account' : 'Đăng ký tài khoản'}
              </Link>
            </div>
            {unlockNotice && (
              <div className={`text-xs font-semibold ${unlockNotice.ok ? 'text-emerald-600' : 'text-amber-700 dark:text-amber-300'}`}>
                {unlockNotice.msg}
              </div>
            )}
          </div>
        ) : (
        <>

        {/* Main 12-Col LMS Classroom */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 8 Cols: Video / PDF / PPT / Exam Stage */}
          <div className="lg:col-span-8 space-y-5">
            <div className="rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 overflow-hidden shadow-sm">
              {/* Stage Mode Switcher */}
              <div className="px-4 py-3 border-b border-paper-200 dark:border-ink-800 bg-paper-100 dark:bg-ink-950 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStageMode('video')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 ${
                      stageMode === 'video' ? 'bg-[#146EBE] text-white' : 'bg-paper-50 dark:bg-ink-900 border border-paper-300 dark:border-ink-700'
                    }`}
                  >
                    <Video className="w-3.5 h-3.5" /> {isEn ? `YouTube Video (${videos.length})` : `Video YouTube (${videos.length})`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStageMode('document')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 ${
                      stageMode === 'document' ? 'bg-[#146EBE] text-white' : 'bg-paper-50 dark:bg-ink-900 border border-paper-300 dark:border-ink-700'
                    }`}
                  >
                    <Presentation className="w-3.5 h-3.5" /> {isEn ? `Slides PPT / PDF (${attachments.length})` : `Slide PPT / PDF (${attachments.length})`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStageMode('exam')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 ${
                      stageMode === 'exam' ? 'bg-amber-500 text-ink-950' : 'bg-paper-50 dark:bg-ink-900 border border-paper-300 dark:border-ink-700'
                    }`}
                  >
                    <Award className="w-3.5 h-3.5" /> {isEn ? 'Quizzes & NFT Certificate' : 'Bài tập & Thi Chứng chỉ NFT'}
                  </button>
                </div>

                {activeLesson && (
                  <span className="text-xs font-semibold text-editorial-teal truncate max-w-xs">
                    {isEn ? `Current lesson: ${activeLesson.title}` : `Đang học: ${activeLesson.title}`}
                  </span>
                )}
              </div>

              {/* Stage Display */}
              {stageMode === 'video' && (
                <div className="bg-ink-950">
                  {activeVideoEmbedUrl ? (
                    <>
                      <div className="aspect-video w-full">
                        <iframe
                          key={activeVideoEmbedUrl}
                          title={activeVideoTitle}
                          src={`${activeVideoEmbedUrl}?rel=0`}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                      {activeLessonNotesHtml && (
                        <div
                          className="p-4 bg-paper-50 dark:bg-ink-900 border-t border-paper-200 dark:border-ink-800 text-xs sm:text-sm text-ink-700 dark:text-ink-300 leading-relaxed space-y-2 [&_a]:text-[#146EBE] [&_a]:underline"
                          dangerouslySetInnerHTML={{ __html: sanitizeHtmlContent(activeLessonNotesHtml) }}
                        />
                      )}
                      {videos.length > 1 && !activeLesson?.youtube_embed_url && (
                        <div className="p-3 bg-ink-900 flex flex-wrap gap-2">
                          {videos.map((v, idx) => (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => setActiveVideoIdx(idx)}
                              className={`px-3 py-1.5 rounded text-xs font-semibold ${
                                idx === activeVideoIdx ? 'bg-[#146EBE] text-white' : 'bg-ink-800 text-paper-200'
                              }`}
                            >
                              {v.title}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="aspect-video flex flex-col items-center justify-center text-paper-200 p-8 text-center space-y-3">
                      <PlayCircle className="w-14 h-14 text-sky-400" />
                      <div className="max-w-md space-y-1">
                        <div className="font-serif text-lg font-bold">
                          {activeLesson ? activeLesson.title : activeCourse.title}
                        </div>
                        <p className="text-xs text-ink-400">
                          {isEn ? (
                            <>YouTube lecture stream for this lesson is synced from the archive metadata or updated via Admin CMS.</>
                          ) : (
                            <>Video bài giảng YouTube riêng của bài học này nằm trong vùng thành viên LearnPress cũ và sẽ được gắn trực tiếp ID YouTube khi đồng bộ bảng <code>wp_postmeta</code> hoặc cập nhật trong Admin CMS.</>
                          )}
                        </p>
                      </div>
                      {attachments.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setStageMode('document')}
                          className="px-4 py-2 rounded-lg bg-[#146EBE] text-white text-xs font-bold"
                        >
                          {isEn ? `View ${attachments.length} Attached Slides PPT / PDF →` : `Xem ngay ${attachments.length} Slide PPT / PDF đính kèm →`}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {stageMode === 'document' && (
                <div className="p-5 space-y-4">
                  {activeAttachment ? (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap gap-2">
                          {attachments.map((att, idx) => (
                            <button
                              key={`${att.url}-${idx}`}
                              type="button"
                              onClick={() => setActiveFileIdx(idx)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                                idx === activeFileIdx
                                  ? 'bg-[#146EBE] text-white border-[#146EBE]'
                                  : 'border-paper-300 dark:border-ink-700'
                              }`}
                            >
                              [{att.file_type.toUpperCase()}] {att.title.slice(0, 36)}
                            </button>
                          ))}
                        </div>
                        <a
                          href={resolveMediaUrl(activeAttachment.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold inline-flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" /> {isEn ? 'Download Source File' : 'Tải tệp gốc'}
                        </a>
                      </div>
                      <iframe
                        title={activeAttachment.title}
                        src={getViewerUrl(activeAttachment)}
                        className="w-full h-[540px] rounded-xl border border-paper-300 dark:border-ink-800 bg-white"
                      />
                    </>
                  ) : (
                    <div className="py-16 text-center space-y-2 text-xs text-ink-500">
                      <FileText className="w-10 h-10 mx-auto text-ink-400" />
                      <p>
                        {isEn ? (
                          <>No public PPT/PDF slides attached to this course yet. Explore more books in our <Link to="/thu-vien-sach/" className="text-[#146EBE] underline font-semibold">59+ Books &amp; PDF Library</Link>.</>
                        ) : (
                          <>Khóa học này chưa có tệp PPT/PDF gắn sẵn ở mô tả công khai. Bạn có thể tải thêm tài liệu ở <Link to="/thu-vien-sach/" className="text-[#146EBE] underline font-semibold">Thư viện 59+ Sách &amp; PDF</Link>.</>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {stageMode === 'exam' && (
                <div className="p-6 sm:p-8 space-y-5 bg-gradient-to-br from-paper-50 to-amber-50/40 dark:from-ink-900 dark:to-ink-950">
                  <div className="flex items-center gap-2 text-amber-600 font-bold text-sm">
                    <Award className="w-5 h-5" />
                    {isEn ? 'Exercises & NFT Certificate Portal ($0 Real Money)' : 'Cổng Bài tập & Thi cấp Chứng chỉ NFT (0đ Tiền Thật)'}
                  </div>
                  <h2 className="font-serif text-2xl font-bold">
                    {isEn ? `Complete "${activeCourse.title}" to mint an NFT Certificate` : `Hoàn thành khóa “${activeCourse.title}” để đúc NFT Chứng chỉ`}
                  </h2>
                  <p className="text-sm text-ink-700 dark:text-ink-300 leading-relaxed">
                    {isEn ? (
                      <>Assessment quizzes connect to the dedicated exam portal <code>staging-store.vneconomics.com</code>. After completing the lessons or passing the exam, you can immediately mint a verifiable <strong>NFT Certificate (VNE-CERT)</strong> on Testnet.</>
                    ) : (
                      <>Hệ thống bài tập thi đánh giá năng lực sẽ được kết nối sang cổng thi chuyên biệt <code>staging-store.vneconomics.com</code> (dữ liệu 3 bộ đề thi đã được ETL xuất sẵn tại <code>exports/exam_banks/</code>). Sau khi hoàn thành bài học hoặc đạt chuẩn bài thi, bạn có thể đúc ngay <strong>NFT Chứng chỉ (VNE-CERT)</strong> trên Testnet.</>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      to="/cardano-hub/"
                      className="px-5 py-2.5 rounded-xl bg-[#146EBE] text-white text-xs font-bold inline-flex items-center gap-1.5"
                    >
                      <Award className="w-4 h-4" /> {isEn ? 'Open NFT Certificate Mint Studio' : 'Mở Studio Đúc Chứng chỉ NFT'}
                    </Link>
                    <a
                      href="https://staging-store.vneconomics.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-5 py-2.5 rounded-xl border border-paper-300 dark:border-ink-700 text-xs font-bold inline-flex items-center gap-1.5"
                    >
                      {isEn ? 'Exam Portal (staging-store)' : 'Cổng Thi & Bài tập (staging-store)'} <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              )}

              {/* Lesson Action Footer */}
              <div className="px-5 py-3.5 border-t border-paper-200 dark:border-ink-800 flex flex-wrap items-center justify-between gap-3 bg-paper-50 dark:bg-ink-900">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentIdx <= 0}
                    onClick={() => currentIdx > 0 && setActiveLessonId(allLessons[currentIdx - 1].id)}
                    className="px-3 py-1.5 rounded-lg border border-paper-300 dark:border-ink-700 text-xs font-semibold inline-flex items-center gap-1 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> {isEn ? 'Previous' : 'Bài trước'}
                  </button>
                  <button
                    type="button"
                    disabled={currentIdx < 0 || currentIdx >= allLessons.length - 1}
                    onClick={() => currentIdx < allLessons.length - 1 && setActiveLessonId(allLessons[currentIdx + 1].id)}
                    className="px-3 py-1.5 rounded-lg border border-paper-300 dark:border-ink-700 text-xs font-semibold inline-flex items-center gap-1 disabled:opacity-40"
                  >
                    {isEn ? 'Next Lesson' : 'Bài tiếp'} <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {activeLesson && (
                  <button
                    type="button"
                    onClick={() => toggleLessonComplete(activeCourse.slug, activeLesson)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold inline-flex items-center gap-1.5 hover:bg-emerald-700"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {completedIds.includes(activeLesson.id)
                      ? isEn
                        ? 'Lesson Completed'
                        : 'Đã hoàn thành bài này'
                      : isEn
                        ? 'Mark Complete (+10 VNE)'
                        : 'Đánh dấu hoàn thành (+10 VNE)'}
                  </button>
                )}
              </div>
              {lessonNotice && (
                <div className="px-5 py-2 bg-emerald-50 dark:bg-emerald-950/40 text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                  {lessonNotice}
                </div>
              )}
            </div>

            {/* Bottom Classroom Tabs: Overview | Attachments | AI BYOK */}
            <div className="rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-6 space-y-5">
              <div className="flex flex-wrap gap-4 border-b border-paper-200 dark:border-ink-800">
                {[
                  { id: 'overview', label: isEn ? 'Course Content & Overview' : 'Nội dung & Mô tả Khóa học' },
                  { id: 'files', label: isEn ? `Slides PPT / PDF (${attachments.length})` : `Tài liệu Slide PPT / PDF (${attachments.length})` },
                  {
                    id: 'reviews',
                    label: isEn
                      ? `Reviews & Comments (${(activeCourse.comments?.length || 0) + (activeCourse.reviews?.length || 0)})`
                      : `Đánh giá & Bình luận (${(activeCourse.comments?.length || 0) + (activeCourse.reviews?.length || 0)})`,
                  },
                  { id: 'ai', label: isEn ? 'AI Study Assistant (BYOK)' : 'Trợ lý Học tập AI (BYOK)' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setBottomTab(t.id as BottomTab)}
                    className={`pb-2.5 text-sm font-bold border-b-2 transition-colors ${
                      bottomTab === t.id ? 'border-[#146EBE] text-[#146EBE]' : 'border-transparent text-ink-500'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {bottomTab === 'overview' && (
                <div className="space-y-4">
                  <h1 className="font-serif text-2xl font-bold text-ink-950 dark:text-paper-50">
                    {activeCourse.title}
                  </h1>
                  {isEn ? (
                    <p className="text-sm text-ink-700 dark:text-ink-300 leading-relaxed">
                      {(activeCourse as CatalogCourse & { summary_en?: string }).summary_en ||
                        `Structured digital curriculum covering ${activeCourse.title}, including guided video modules, slide decks, and on-chain Testnet certification.`}
                    </p>
                  ) : (
                    <div
                      className="text-sm text-ink-700 dark:text-ink-300 leading-relaxed space-y-3 [&_h2]:font-serif [&_h2]:text-xl [&_h2]:font-bold [&_a]:text-[#146EBE] [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeHtmlContent(
                          activeCourse.description_html || '<p>Thông tin chi tiết khóa học đang được cập nhật.</p>',
                        ),
                      }}
                    />
                  )}
                </div>
              )}

              {bottomTab === 'files' && (
                <div className="space-y-2.5">
                  {attachments.length === 0 ? (
                    <p className="text-xs text-ink-500">
                      {isEn
                        ? 'No direct PPT/PDF attachments are included in this course yet.'
                        : 'Chưa có tệp PPT/PDF đính kèm trực tiếp trong khóa học này.'}
                    </p>
                  ) : (
                    attachments.map((att, idx) => (
                      <div
                        key={`${att.url}-${idx}`}
                        className="p-3.5 rounded-xl border border-paper-300 dark:border-ink-800 bg-paper-100 dark:bg-ink-950 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#146EBE]/10 text-[#146EBE] mr-2">
                            {att.file_type}
                          </span>
                          <span className="text-xs font-semibold">{att.title}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveFileIdx(idx);
                              setStageMode('document');
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="px-3 py-1.5 rounded-lg border border-paper-300 dark:border-ink-700 text-xs font-semibold"
                          >
                            {isEn ? 'View inline' : 'Xem trên web'}
                          </button>
                          <a
                            href={resolveMediaUrl(att.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-lg bg-[#146EBE] text-white text-xs font-semibold inline-flex items-center gap-1"
                          >
                            <Download className="w-3.5 h-3.5" /> {isEn ? 'Download' : 'Tải về'}
                          </a>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {bottomTab === 'ai' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-ink-600 dark:text-ink-400">
                      {isEn
                        ? 'Use your personal API Key (BYOK) to generate summaries or review quizzes for the active lesson.'
                        : 'Dùng API Key cá nhân (BYOK) để tạo tóm tắt hoặc câu hỏi ôn tập cho bài học đang chọn.'}
                    </span>
                    <Link to="/ai-lab/" className="text-xs font-bold text-[#146EBE] hover:underline">
                      {isEn ? 'Configure Key →' : 'Cài đặt Key →'}
                    </Link>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={aiLoading}
                      onClick={() => handleAskAiLesson('summary')}
                      className="px-3.5 py-2 rounded-lg bg-[#146EBE] text-white text-xs font-bold inline-flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> {isEn ? 'Generate Key Lesson Outline' : 'Lập dàn ý trọng tâm bài này'}
                    </button>
                    <button
                      type="button"
                      disabled={aiLoading}
                      onClick={() => handleAskAiLesson('quiz')}
                      className="px-3.5 py-2 rounded-lg border border-paper-300 dark:border-ink-700 text-xs font-bold"
                    >
                      {isEn ? 'Create 5 Review Questions' : 'Tạo 5 câu hỏi ôn tập'}
                    </button>
                  </div>
                  {aiLoading && <p className="text-xs text-ink-500">{isEn ? 'AI is processing...' : 'AI đang xử lý...'}</p>}
                  {aiError && <p className="text-xs text-rose-600">{aiError}</p>}
                  {aiNote && (
                    <div className="p-4 rounded-xl bg-paper-100 dark:bg-ink-950 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">
                      {aiNote}
                    </div>
                  )}
                </div>
              )}

              {bottomTab === 'reviews' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-600 dark:text-ink-400">
                    <span className="font-semibold inline-flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-[#146EBE]" />
                      {activeCourse.students_count}{' '}
                      {isEn
                        ? 'learners imported from legacy vneconomics.com'
                        : 'học viên thực tế đồng bộ từ website cũ vneconomics.com'}
                    </span>
                    {activeCourse.rating_average ? (
                      <span className="inline-flex items-center gap-1 font-bold text-amber-500">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        {activeCourse.rating_average}/5 ({activeCourse.rating_count || 0})
                      </span>
                    ) : null}
                  </div>

                  {([...(activeCourse.reviews || []), ...(activeCourse.comments || [])]).length === 0 ? (
                    <p className="text-xs text-ink-500">
                      {isEn
                        ? 'No legacy student comments or reviews were recorded for this course on vneconomics.com.'
                        : 'Chưa có bình luận hoặc đánh giá công khai nào được ghi nhận cho khóa học này trên website cũ.'}
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {[...(activeCourse.reviews || []), ...(activeCourse.comments || [])].map((cm) => (
                        <div
                          key={cm.id}
                          className="p-4 rounded-xl border border-paper-200 dark:border-ink-800 bg-paper-100 dark:bg-ink-950 space-y-2"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex flex-wrap items-center gap-2">
                              <strong className="text-ink-950 dark:text-paper-50">{cm.author_name}</strong>
                              <span className="px-2 py-0.5 rounded bg-[#146EBE]/10 text-[#146EBE] text-[10px] font-semibold">
                                vneconomics.com
                              </span>
                              {cm.lesson_title && (
                                <span className="px-2 py-0.5 rounded bg-paper-200 dark:bg-ink-800 text-ink-600 dark:text-ink-300 text-[10px] font-medium">
                                  {isEn ? `Lesson: ${cm.lesson_title}` : `Bài: ${cm.lesson_title}`}
                                </span>
                              )}
                              {cm.rating ? (
                                <span className="inline-flex items-center gap-0.5 text-amber-500 font-bold">
                                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {cm.rating}/5
                                </span>
                              ) : null}
                            </div>
                            <span className="text-[11px] text-ink-500 tabular-nums">
                              {cm.date.slice(0, 10)}
                            </span>
                          </div>
                          <div
                            className="text-xs sm:text-sm text-ink-700 dark:text-ink-300 leading-relaxed space-y-1.5"
                            dangerouslySetInnerHTML={{ __html: sanitizeHtmlContent(cm.content_html) }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right 4 Cols: Sticky Real Curriculum Accordion */}
          <aside className="lg:col-span-4 rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 overflow-hidden lg:sticky lg:top-20">
            <div className="p-5 border-b border-paper-200 dark:border-ink-800 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-lg font-bold flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#146EBE]" />
                  {isEn ? 'Course Syllabus' : 'Giáo trình Khóa học'}
                </h2>
                <span className="text-xs font-mono tabular-nums text-ink-500">
                  {activeCourse.sections?.length || 0} {isEn ? 'modules' : 'chương'} • {totalLessons} {isEn ? 'lessons' : 'bài'}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-paper-200 dark:bg-ink-800 overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progressPct}%` }} />
              </div>
            </div>

            <div className="max-h-[540px] overflow-y-auto divide-y divide-paper-200 dark:divide-ink-800">
              {activeCourse.sections && activeCourse.sections.length > 0 ? (
                activeCourse.sections.map((sec) => {
                  const isOpen = Boolean(openSections[sec.id]);
                  return (
                    <div key={sec.id}>
                      <button
                        type="button"
                        onClick={() => setOpenSections((prev) => ({ ...prev, [sec.id]: !prev[sec.id] }))}
                        className="w-full px-4 py-3 bg-paper-100/70 dark:bg-ink-950/60 flex items-center justify-between gap-2 text-left hover:bg-paper-200/60 dark:hover:bg-ink-800/60"
                      >
                        <div>
                          <div className="text-xs font-bold text-ink-950 dark:text-paper-50">{sec.title}</div>
                          <div className="text-[11px] text-ink-500 tabular-nums">
                            {sec.items.length} {isEn ? 'lessons' : 'bài học'}
                          </div>
                        </div>
                        {isOpen ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
                      </button>

                      {isOpen && (
                        <ul className="divide-y divide-paper-200/70 dark:divide-ink-800/70">
                          {sec.items.map((item) => {
                            const isActive = item.id === activeLessonId;
                            const isDone = completedIds.includes(item.id);
                            return (
                              <li key={item.id}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveLessonId(item.id);
                                    if (item.title.toLowerCase().includes('thi') || item.title.toLowerCase().includes('exam')) setStageMode('exam');
                                  }}
                                  className={`w-full px-4 py-2.5 text-left flex items-start gap-2.5 text-xs transition-colors ${
                                    isActive
                                      ? 'bg-[#146EBE]/10 text-[#146EBE] dark:bg-sky-500/15 dark:text-sky-300 font-semibold'
                                      : 'hover:bg-paper-100 dark:hover:bg-ink-800/50'
                                  }`}
                                >
                                  <CheckCircle2
                                    className={`w-4 h-4 mt-0.5 shrink-0 ${
                                      isDone ? 'text-emerald-500' : 'text-ink-300 dark:text-ink-700'
                                    }`}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="line-clamp-2">{item.title}</div>
                                    {item.duration && <div className="text-[10px] text-ink-400 mt-0.5">{item.duration}</div>}
                                  </div>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-5 text-xs text-ink-500">
                  {isEn
                    ? 'This course presents integrated modules inside the Overview tab and attached Videos/Documents.'
                    : 'Khóa học này trình bày nội dung tổng hợp trong phần Tổng quan và Video/Tài liệu đính kèm.'}
                </div>
              )}
            </div>

            <div className="p-4 bg-paper-100 dark:bg-ink-950 border-t border-paper-200 dark:border-ink-800 space-y-2 text-xs">
              <div className="font-bold flex items-center gap-1.5 text-amber-600">
                <Award className="w-4 h-4" />{' '}
                {isEn
                  ? `Completion Reward: +${activeCourse.reward_points} VNE & NFT Certificate`
                  : `Thưởng hoàn thành: +${activeCourse.reward_points} VNE & Chứng chỉ NFT`}
              </div>
              <button
                type="button"
                onClick={() => setStageMode('exam')}
                className="w-full py-2 rounded-lg bg-[#146EBE] hover:bg-[#0f5ba0] text-white font-bold transition-colors"
              >
                {isEn ? 'Open NFT Certificate Exam Portal →' : 'Mở Cổng Thi lấy Chứng chỉ NFT →'}
              </button>
            </div>
          </aside>
        </div>
        </>
        )}
      </div>
    );
  }

  // ============================================================================
  // E-COMMERCE COURSE MARKETPLACE LISTING VIEW (/hoc-vien/)
  // ============================================================================
  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-[#0F172A] via-[#1E3A8A] to-[#146EBE] text-white p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-5 shadow-sm">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-white/15 px-3 py-1 rounded-full">
            <GraduationCap className="w-3.5 h-3.5" />
            VNE Academy Store • Video YouTube + PPT/PDF + NFT Cert
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold">
            {isEn
              ? `Digital Economy, Cardano Blockchain & Digital Marketing Courses (${courses.length} courses)`
              : `Sàn Khóa học Kinh tế số, Blockchain Cardano & Digital Marketing (${courses.length} khóa)`}
          </h1>
          <p className="text-xs sm:text-sm text-white/85 max-w-2xl">
            {isEn ? (
              <>Integrated curriculum, YouTube lectures, PDF/PPT decks, and assessment exams earning verifiable Testnet <strong>NFT Certificates (VNE-CERT)</strong> for $0.</>
            ) : (
              <>Tích hợp đầy đủ giáo trình LearnPress, video YouTube, tài liệu PDF/PPT và bài thi nhận <strong>Chứng chỉ NFT (VNE-CERT)</strong> trên Testnet 0đ.</>
            )}
          </p>
        </div>

        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 text-ink-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isEn ? 'Search courses, instructors...' : 'Tìm khóa học, giảng viên...'}
            className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-white text-ink-900 text-xs sm:text-sm focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <aside className="lg:col-span-3 rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-5 space-y-5 lg:sticky lg:top-20">
          <div className="font-bold text-sm flex items-center gap-2 border-b border-paper-200 dark:border-ink-800 pb-3">
            <Filter className="w-4 h-4 text-[#146EBE]" />
            {isEn ? 'Filter Courses' : 'Lọc Khóa học'}
          </div>

          <div className="space-y-1">
            {[
              { id: 'all', label: isEn ? `All Courses (${courses.length})` : `Tất cả khóa học (${courses.length})` },
              { id: 'blockchain', label: isEn ? 'Blockchain, Cardano & Bitcoin' : 'Blockchain, Cardano & Bitcoin' },
              { id: 'economics_marketing', label: isEn ? 'Digital Economy & Marketing' : 'Kinh tế số & Digital Marketing' },
              { id: 'enrolled', label: isEn ? `Enrolled (${enrolled.length})` : `Đã ghi danh (${enrolled.length})` },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setTopicFilter(f.id as CourseFilter)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  topicFilter === f.id
                    ? 'bg-[#146EBE] text-white font-bold'
                    : 'hover:bg-paper-100 dark:hover:bg-ink-800 text-ink-700 dark:text-ink-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="p-3.5 rounded-xl bg-paper-100 dark:bg-ink-950 border border-paper-200 dark:border-ink-800 text-xs space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-emerald-600">
              <ShieldCheck className="w-4 h-4" /> {isEn ? 'Study $0 — Earn NFT Cert' : 'Học 0đ — Cấp NFT Cert'}
            </div>
            <p className="text-ink-500">
              {isEn
                ? 'Complete lectures & exams to earn VNE Points and mint an on-chain certificate.'
                : 'Hoàn thành bài giảng & bài thi để nhận VNE Points và đúc chứng chỉ on-chain.'}
            </p>
          </div>
        </aside>

        <div className="lg:col-span-9 space-y-4">
          <div className="rounded-xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="font-semibold tabular-nums">
              {isEn ? (
                <>
                  Showing <strong>{filtered.length}</strong> courses
                </>
              ) : (
                <>
                  Hiển thị <strong>{filtered.length}</strong> khóa học
                </>
              )}
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-ink-500 mr-1">{isEn ? 'Sort:' : 'Sắp xếp:'}</span>
              {[
                { id: 'students_desc', label: isEn ? 'Most Enrolled' : 'Học viên đông nhất' },
                { id: 'lessons_desc', label: isEn ? 'Most Lessons' : 'Nhiều bài học nhất' },
                { id: 'title_az', label: isEn ? 'Title A–Z' : 'Tên A–Z' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSortBy(s.id as CourseSort)}
                  className={`px-3 py-1.5 rounded-lg font-semibold ${
                    sortBy === s.id
                      ? 'bg-[#146EBE] text-white'
                      : 'bg-paper-100 dark:bg-ink-800 text-ink-700 dark:text-ink-300'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {filtered.map((c) => {
              const { src: coverSrc, isFallbackLogo } = resolveCoverOrLogo(c.cover_image);
              const isEnrolled = enrolled.includes(c.slug);
              const lessonsCount = c.lessons_count || 0;
              const videosCount = c.youtube_videos?.length || 0;
              const filesCount = c.attachments?.length || 0;

              return (
                <Link
                  key={c.slug}
                  to={`/course/${c.slug}/`}
                  className="group rounded-xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 overflow-hidden hover:shadow-lg hover:border-[#146EBE] transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="relative aspect-video bg-paper-100 dark:bg-ink-950 overflow-hidden flex items-center justify-center p-2">
                      <img
                        src={coverSrc}
                        alt={c.title}
                        loading="lazy"
                        onError={handleCoverImageError}
                        className={
                          isFallbackLogo
                            ? 'w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300'
                            : 'w-full h-full object-contain group-hover:scale-105 transition-transform duration-300'
                        }
                      />
                      <span className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase shadow-sm ${isItemUnlocked(`course:${c.slug}`) ? 'bg-emerald-600 text-white' : 'bg-amber-400 text-ink-950'}`}>
                        {isItemUnlocked(`course:${c.slug}`)
                          ? isEn
                            ? 'Unlocked'
                            : 'Đã mở khóa'
                          : `${DEFAULT_RESOURCE_UNLOCK_COST} VNE`}
                      </span>
                      <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/75 text-amber-300 text-[10px] font-bold tabular-nums">
                        +{c.reward_points} VNE • NFT
                      </span>
                    </div>

                    <div className="p-4 space-y-2">
                      <div className="text-[11px] font-semibold text-[#146EBE] dark:text-sky-400 truncate">
                        {c.instructor_name || (isEn ? 'VNEconomics Faculty' : 'Ban Giảng viên VNEconomics')}
                      </div>
                      <h2 className="text-sm font-bold text-ink-950 dark:text-paper-50 group-hover:text-[#146EBE] line-clamp-2 min-h-[2.5rem]">
                        {c.title}
                      </h2>
                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-ink-500 tabular-nums">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-paper-100 dark:bg-ink-800">
                          <BookOpen className="w-3 h-3" /> {lessonsCount} {isEn ? 'lessons' : 'bài'}
                        </span>
                        {videosCount > 0 && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-paper-100 dark:bg-ink-800">
                            <Video className="w-3 h-3" /> {videosCount} video
                          </span>
                        )}
                        {filesCount > 0 && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-paper-100 dark:bg-ink-800">
                            <FileText className="w-3 h-3" /> {filesCount} {isEn ? 'files' : 'file'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-ink-500 tabular-nums pt-0.5">
                        <span className="inline-flex items-center gap-1 text-amber-500 font-semibold">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> 4.9
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" /> {c.students_count} {isEn ? 'learners' : 'học viên'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="px-4 py-3 border-t border-paper-200 dark:border-ink-800 flex items-center justify-between text-xs">
                    <span className="font-extrabold text-[#146EBE] dark:text-emerald-400">{isEn ? '$0' : '0 ₫'}</span>
                    <span className="px-3 py-1 rounded-lg bg-[#146EBE] text-white font-bold">
                      {isEn ? (isEnrolled ? 'Enter Class →' : 'Start Learning') : isEnrolled ? 'Vào lớp học →' : 'Vào học ngay'}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
