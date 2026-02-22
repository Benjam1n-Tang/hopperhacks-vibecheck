/**
 * Command-line script to seed test participants
 *
 * Usage:
 *   node seed-participants.js ABC123 10
 *
 * This adds 10 test participants to session ABC123
 */

const SESSION_CODE = process.argv[2];
const COUNT = parseInt(process.argv[3]) || 10;

if (!SESSION_CODE) {
  console.error('Usage: node seed-participants.js <SESSION_CODE> [COUNT]');
  console.error('Example: node seed-participants.js ABC123 10');
  process.exit(1);
}

async function seedParticipants() {
  try {
    console.log(
      `Adding ${COUNT} test participants to session ${SESSION_CODE}...`,
    );

    const response = await fetch(
      'http://localhost:3000/api/session/seed-test',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionCode: SESSION_CODE,
          count: COUNT,
        }),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to seed participants');
    }

    const data = await response.json();
    console.log(
      `✓ Successfully added ${data.participants.length} test participants!`,
    );
    console.log('\nParticipants added:');
    data.participants.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.display_name}`);
    });
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
}

seedParticipants();
