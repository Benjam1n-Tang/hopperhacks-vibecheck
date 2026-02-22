import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Random names for testing
const FIRST_NAMES = [
  'Alex',
  'Jordan',
  'Taylor',
  'Morgan',
  'Casey',
  'Riley',
  'Avery',
  'Quinn',
  'Sam',
  'Drew',
  'Charlie',
  'Dakota',
  'River',
  'Skylar',
  'Harper',
  'Rowan',
];

// Diverse personality profiles for better grouping testing
const PERSONAS = [
  // Tech Enthusiasts (should group together)
  "I'm a software engineer who loves building web apps with React and TypeScript. I enjoy hackathons and discussing the latest tech trends. Coffee addict and open source contributor.",
  'Full-stack developer passionate about AI and machine learning. I spend my weekends learning new frameworks and building side projects. Always excited to collaborate on innovative ideas.',
  'Frontend developer with a love for UI/UX design. I enjoy creating beautiful, accessible interfaces and staying up-to-date with modern web technologies like Next.js and Tailwind.',

  // Creative Artists (should group together)
  'Visual artist and graphic designer. I love painting, digital art, and photography. Inspired by nature and human emotions. Always carrying a sketchbook.',
  'Musician and songwriter who plays guitar and piano. I enjoy indie and alternative music, writing lyrics, and performing at local venues. Music is my life.',
  'Professional photographer specializing in portraits and landscapes. I love capturing moments and telling stories through images. Always hunting for the perfect shot.',

  // Outdoor Adventurers (should group together)
  'Avid hiker and rock climber. I spend every weekend exploring trails and mountains. Passionate about environmental conservation and sustainable living. Nature is where I feel most alive.',
  'Trail runner and backpacker. I love camping under the stars, hiking challenging terrain, and pushing my physical limits. Adventure is my therapy.',
  'Mountain biker and outdoor enthusiast. I enjoy extreme sports, wildlife photography, and exploring remote areas. The wilderness calls to me.',

  // Foodies & Social (should group together)
  'Food blogger and home chef. I love experimenting with new recipes, exploring different cuisines, and hosting dinner parties. Cooking is my creative outlet.',
  "Restaurant enthusiast and amateur sommelier. I enjoy trying new foods, wine tasting, and bringing people together over great meals. Life's too short for boring food!",
  'Baker and pastry lover. I spend my free time perfecting bread recipes and creating elaborate desserts. Sharing food with others brings me joy.',

  // Fitness & Wellness (should group together)
  'Yoga instructor and wellness coach. I believe in mindfulness, meditation, and holistic health. Morning routines and green smoothies are my vibe.',
  'CrossFit athlete and nutrition enthusiast. I love pushing my body to its limits and helping others reach their fitness goals. Discipline equals freedom.',
  'Marathon runner and health advocate. I enjoy early morning runs, meal prepping, and maintaining a balanced lifestyle. Running clears my mind.',

  // Gamers & Nerds (should group together)
  'Competitive gamer and esports fan. I main support in League and love strategy games. Always up for a gaming session or discussing game theory.',
  'RPG enthusiast and D&D dungeon master. I love storytelling, worldbuilding, and collecting dice. Currently running a homebrew campaign.',
  'Retro gaming collector and speedrunner. I enjoy classic Nintendo games, arcade culture, and gaming history. My collection is my pride.',

  // Introverted Readers (should group together)
  "Bookworm and fantasy fiction lover. I read 50+ books a year and enjoy cozy reading nooks. Currently obsessed with Brandon Sanderson's Cosmere.",
  'Sci-fi enthusiast and aspiring writer. I love philosophy, futurism, and thought-provoking narratives. Books are my escape from reality.',
  'Library regular and poetry lover. I enjoy quiet contemplation, journaling, and finding meaning in words. Reading is my meditation.',

  // Empty/minimal summaries (for random sorting test)
  '',
  'Just here to meet people',
  'idk lol',
];

function generateRandomParticipant() {
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const number = Math.floor(Math.random() * 100);
  const persona = PERSONAS[Math.floor(Math.random() * PERSONAS.length)];

  return {
    displayName: `${firstName}${number}`,
    summary: persona,
  };
}

export async function POST(request: Request) {
  try {
    const { sessionCode, count = 5 } = await request.json();

    if (!sessionCode) {
      return NextResponse.json(
        { error: 'Session code required' },
        { status: 400 },
      );
    }

    const supabase = createClient();

    // Check if session exists
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id')
      .eq('code', sessionCode.toUpperCase())
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Generate and insert random participants
    const participants = [];
    for (let i = 0; i < Math.min(count, 20); i++) {
      const { displayName, summary } = generateRandomParticipant();
      participants.push({
        session_id: session.id,
        display_name: displayName,
        summary: summary,
        clerk_id: null,
      });
    }

    const { data, error } = await supabase
      .from('participants')
      .insert(participants)
      .select();

    if (error) {
      console.error('Error adding test participants:', error);
      return NextResponse.json(
        { error: 'Failed to add participants' },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        message: `Added ${data.length} test participants`,
        participants: data,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error in seed endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
