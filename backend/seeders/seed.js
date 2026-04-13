const bcrypt = require('bcryptjs');
const { User, sequelize } = require('../models');

async function seed() {
  try {
    const hashed = await bcrypt.hash('Sree123@', 10);
    await User.findOrCreate({
      where: { email: 'sreejith.s@webandcrafts.com' },
      defaults: {
        firstName: 'Sreejith', lastName: 'S',
        email: 'sreejith.s@webandcrafts.com', password: hashed,
        role: 'QA Lead', department: 'Engineering',
        location: 'Kerala, India', timezone: 'Asia/Kolkata',
        bio: 'Senior QA Lead with expertise in test automation, API testing, and quality assurance.',
        github: '', linkedin: '',
      }
    });
    console.log('✓ Seed complete (admin user only)');
  } catch (err) {
    console.error('Seed error:', err);
    throw err;
  }
}

if (require.main === module) {
  sequelize.sync({ force: true }).then(seed).then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
}

module.exports = { seed };
