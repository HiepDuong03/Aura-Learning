import { ActivePracticeMission } from '../types';
import { RoleplayPersona } from '../components/Speaking/RoleplayChatRoom';

/**
 * Builds a dedicated, topic-accurate AI Roleplay Persona from an ActivePracticeMission
 * (launched from Roadmap IELTS Topics / CEFR Vocab / Grammar) so the learner immediately
 * practices the exact vocabulary or grammar they just studied instead of landing on
 * the default Barista persona.
 */
export function buildMissionRoleplayPersona(mission: ActivePracticeMission): RoleplayPersona {
  const cleanTopic = (mission.topicName || mission.sourceTitle || 'English Discussion').trim();
  const words = (mission.targetWords || []).map((w) => w.word.trim()).filter(Boolean);
  const wordListText = words.slice(0, 5).join(', ');
  const firstWord = words[0];
  const secondWord = words[1];

  const isGrammarMission = Boolean(mission.grammarFocus);
  const stableSlug = (mission.sourceTitle || mission.id)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

  if (isGrammarMission && mission.grammarFocus) {
    return {
      id: `mission-grammar-${stableSlug || 'active'}`,
      name: `Luyện Nói · ${mission.cefr}`,
      role: `Gia sư Ngữ pháp (${mission.grammarFocus.title})`,
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop',
      situation: `Thực hành hội thoại tiếng Anh chủ đề "${cleanTopic}" bậc ${mission.cefr}, tập trung áp dụng cấu trúc ngữ pháp "${mission.grammarFocus.title}" (${mission.grammarFocus.formula}).`,
      mission: `Áp dụng tự nhiên cấu trúc "${mission.grammarFocus.title}" (${mission.grammarFocus.formula}) ít nhất 2 lần trong hội thoại.`,
      initialMessage: `Hi! Let's practice "${mission.grammarFocus.title}" in a real conversation about ${cleanTopic}. Could you start by sharing your thoughts using that structure?`,
      initialTranslation: `Chào bạn! Hãy luyện cấu trúc "${mission.grammarFocus.title}" trong hội thoại thật về chủ đề ${cleanTopic}. Bạn thử mở lời chia sẻ quan điểm bằng cấu trúc đó nhé!`,
      isCustom: true
    };
  }

  const requiredCount = Math.min(3, Math.max(1, words.length));
  const initialMessage =
    firstWord && secondWord
      ? `Hi! Today let's discuss ${cleanTopic}. In your view, how important is "${firstWord}" compared to "${secondWord}"? Try using the words you just learned!`
      : firstWord
        ? `Hi! Today let's talk about ${cleanTopic}. What are your thoughts on "${firstWord}"? Feel free to practice your new vocabulary!`
        : `Hi! Today let's discuss ${cleanTopic} at ${mission.cefr} level. What is the biggest trend you've noticed in this area?`;

  const initialTranslation =
    firstWord && secondWord
      ? `Chào bạn! Hôm nay hãy thảo luận về chủ đề ${cleanTopic}. Theo bạn, "${firstWord}" quan trọng như thế nào so với "${secondWord}"? Hãy thử dùng các từ vựng bạn vừa học nhé!`
      : firstWord
        ? `Chào bạn! Hôm nay hãy nói chuyện về ${cleanTopic}. Bạn nghĩ sao về "${firstWord}"? Cứ tự nhiên dùng bộ từ vựng vừa học nhé!`
        : `Chào bạn! Hôm nay hãy thảo luận chủ đề ${cleanTopic} ở bậc ${mission.cefr}. Bạn thấy xu hướng lớn nhất trong lĩnh vực này là gì?`;

  return {
    id: `mission-vocab-${stableSlug || 'active'}`,
    name: `Nhiệm vụ · ${cleanTopic.slice(0, 18)}`,
    role: `Đối tác thảo luận ${mission.cefr} (${mission.sourceTitle})`,
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop',
    situation: `Thảo luận thực chiến về chủ đề "${cleanTopic}" (${mission.sourceTitle}, bậc ${mission.cefr}). Khuyến khích người học sử dụng tự nhiên bộ từ mục tiêu: ${wordListText}.`,
    mission: words.length > 0
      ? `Dùng tự nhiên ít nhất ${requiredCount}/${words.length} cụm từ vừa học: ${wordListText}.`
      : `Thảo luận tự nhiên về chủ đề ${cleanTopic} ở bậc ${mission.cefr}.`,
    initialMessage,
    initialTranslation,
    isCustom: true
  };
}
