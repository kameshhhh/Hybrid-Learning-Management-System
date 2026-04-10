-- ============================================
-- TRIGGERS FOR AUTO-UPDATING COUNTS
-- PostgreSQL Version
-- ============================================

-- Function: Update skill total_tasks when tasks are added/deleted
CREATE OR REPLACE FUNCTION update_skill_task_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE skills 
        SET total_tasks = total_tasks + 1,
            updated_at = NOW()
        WHERE id = NEW.skill_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE skills 
        SET total_tasks = total_tasks - 1,
            updated_at = NOW()
        WHERE id = OLD.skill_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for skill_tasks
DROP TRIGGER IF EXISTS trigger_update_skill_task_count ON skill_tasks;
CREATE TRIGGER trigger_update_skill_task_count
AFTER INSERT OR DELETE ON skill_tasks
FOR EACH ROW EXECUTE FUNCTION update_skill_task_count();

-- Function: Update skill total_chapters when chapters are added/deleted
CREATE OR REPLACE FUNCTION update_skill_chapter_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE skills 
        SET total_chapters = total_chapters + 1,
            updated_at = NOW()
        WHERE id = NEW.skill_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE skills 
        SET total_chapters = total_chapters - 1,
            updated_at = NOW()
        WHERE id = OLD.skill_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for skill_chapters
DROP TRIGGER IF EXISTS trigger_update_skill_chapter_count ON skill_chapters;
CREATE TRIGGER trigger_update_skill_chapter_count
AFTER INSERT OR DELETE ON skill_chapters
FOR EACH ROW EXECUTE FUNCTION update_skill_chapter_count();

-- Function: Update skill total_lessons when lessons are added/deleted
CREATE OR REPLACE FUNCTION update_skill_lesson_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE skills 
        SET total_lessons = total_lessons + 1,
            updated_at = NOW()
        WHERE id = (SELECT skill_id FROM skill_chapters WHERE id = NEW.chapter_id);
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE skills 
        SET total_lessons = total_lessons - 1,
            updated_at = NOW()
        WHERE id = (SELECT skill_id FROM skill_chapters WHERE id = OLD.chapter_id);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for skill_lessons
DROP TRIGGER IF EXISTS trigger_update_skill_lesson_count ON skill_lessons;
CREATE TRIGGER trigger_update_skill_lesson_count
AFTER INSERT OR DELETE ON skill_lessons
FOR EACH ROW EXECUTE FUNCTION update_skill_lesson_count();

-- ============================================
-- FUNCTION: Update student skill progress
-- ============================================

CREATE OR REPLACE FUNCTION update_student_skill_progress()
RETURNS TRIGGER AS $$
BEGIN
    -- Update progress percentage in student_skills
    WITH task_stats AS (
        SELECT 
            COUNT(*) as total_tasks,
            COUNT(da.id) as completed_tasks,
            COALESCE(SUM(da.marks_obtained), 0) as total_marks
        FROM skill_tasks st
        LEFT JOIN daily_assessments da ON da.task_id = st.id AND da.student_id = NEW.student_id
        WHERE st.skill_id = NEW.skill_id
    )
    UPDATE student_skills 
    SET 
        total_tasks_completed = task_stats.completed_tasks,
        total_marks_obtained = task_stats.total_marks,
        progress_percentage = (task_stats.completed_tasks::DECIMAL / NULLIF(task_stats.total_tasks, 0)) * 100,
        status = CASE 
            WHEN task_stats.completed_tasks = task_stats.total_tasks THEN 'completed'::student_skill_status
            ELSE status
        END,
        completed_at = CASE 
            WHEN task_stats.completed_tasks = task_stats.total_tasks THEN NOW()
            ELSE completed_at
        END
    FROM task_stats
    WHERE student_skills.student_id = NEW.student_id AND student_skills.skill_id = NEW.skill_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for daily_assessments
DROP TRIGGER IF EXISTS trigger_update_student_progress ON daily_assessments;
CREATE TRIGGER trigger_update_student_progress
AFTER INSERT OR UPDATE OF marks_obtained ON daily_assessments
FOR EACH ROW
EXECUTE FUNCTION update_student_skill_progress();
