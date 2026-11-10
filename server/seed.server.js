// Starter reference data (from the original migrations 0005 and 0009). Inserted once, on first use.
// Contains no personal data and no accounts. Edit or delete these in the admin area later.

const EXERCISES = [
  ['Barbell Bench Press', 'chest', 'intermediate', 'Press a barbell from the chest on a flat bench.'],
  ['Push-Up', 'chest', 'beginner', 'Bodyweight press from a plank position.'],
  ['Lat Pulldown', 'back', 'beginner', 'Pull a cable bar down to the upper chest.'],
  ['Barbell Row', 'back', 'intermediate', 'Row a barbell toward the lower ribs while bent over.'],
  ['Overhead Press', 'shoulders', 'intermediate', 'Press a barbell overhead from the shoulders.'],
  ['Dumbbell Curl', 'biceps', 'beginner', 'Curl dumbbells with palms facing forward.'],
  ['Tricep Pushdown', 'triceps', 'beginner', 'Push a cable bar down to full elbow extension.'],
  ['Back Squat', 'legs', 'advanced', 'Squat with a barbell resting on the upper back.'],
  ['Leg Press', 'legs', 'beginner', 'Press a weighted platform away with the legs.'],
  ['Romanian Deadlift', 'legs', 'intermediate', 'Hinge at the hips with a slight knee bend.'],
  ['Plank', 'core', 'beginner', 'Hold a straight body position on the forearms.'],
  ['Treadmill Run', 'cardio', 'beginner', 'Steady-state running on a treadmill.'],
  ['Bench Press', 'chest', 'beginner', 'Flat bench press.'],
  ['Incline Dumbbell Press', 'chest', 'beginner', 'Incline dumbbell press.'],
  ['Chest Fly', 'chest', 'beginner', 'Chest fly movement.'],
  ['Triceps Pushdown', 'triceps', 'beginner', 'Cable triceps pushdown.'],
  ['Overhead Triceps Extension', 'triceps', 'beginner', 'Overhead triceps extension.'],
  ['Seated Row', 'back', 'beginner', 'Seated row.'],
  ['One-arm Dumbbell Row', 'back', 'beginner', 'Single-arm dumbbell row.'],
  ['Biceps Curl', 'biceps', 'beginner', 'Biceps curl.'],
  ['Hammer Curl', 'biceps', 'beginner', 'Hammer curl.'],
  ['Squat', 'legs', 'beginner', 'Squat.'],
  ['Leg Curl', 'legs', 'beginner', 'Leg curl.'],
  ['Calf Raise', 'legs', 'beginner', 'Calf raise.'],
  ['Crunches', 'core', 'beginner', 'Abdominal crunch.'],
  ['Shoulder Press', 'shoulders', 'beginner', 'Shoulder press.'],
  ['Lateral Raise', 'shoulders', 'beginner', 'Lateral raise.'],
  ['Rear Delt Fly', 'shoulders', 'beginner', 'Rear deltoid fly.'],
  ['Dips', 'triceps', 'beginner', 'Bodyweight dips.'],
  ['Incline Bench Press', 'chest', 'beginner', 'Incline bench press.'],
  ['Cable Fly', 'chest', 'beginner', 'Cable chest fly.'],
  ['Push-ups', 'chest', 'beginner', 'Bodyweight push-up.'],
  ['EZ-bar Curl', 'biceps', 'beginner', 'EZ-bar biceps curl.'],
  ['Leg Extension', 'legs', 'beginner', 'Leg extension.'],
];

const EQUIPMENT = [
  ['Barbell', 'free_weights', 'Standard Olympic barbell.'],
  ['Dumbbell Rack', 'free_weights', 'Pairs of dumbbells on a rack.'],
  ['Flat Bench', 'free_weights', 'Adjustable flat bench.'],
  ['Cable Machine', 'machines', 'Dual pulley cable station.'],
  ['Leg Press Machine', 'machines', 'Plate-loaded leg press.'],
  ['Treadmill', 'cardio', 'Motorized treadmill.'],
];

const EXERCISE_EQUIPMENT = [
  ['Barbell Bench Press', 'Barbell'],
  ['Barbell Bench Press', 'Flat Bench'],
  ['Dumbbell Curl', 'Dumbbell Rack'],
  ['Lat Pulldown', 'Cable Machine'],
  ['Barbell Row', 'Barbell'],
  ['Overhead Press', 'Barbell'],
  ['Tricep Pushdown', 'Cable Machine'],
  ['Back Squat', 'Barbell'],
  ['Leg Press', 'Leg Press Machine'],
  ['Romanian Deadlift', 'Barbell'],
  ['Treadmill Run', 'Treadmill'],
];

const PLANS = [
  ['Monthly', 40, 30, 'Sample plan: 30 days of gym access.'],
  ['Quarterly', 105, 90, 'Sample plan: 90 days of gym access.'],
  ['Annual', 350, 365, 'Sample plan: 365 days of gym access.'],
];

// The six-day split from migration 0009, laid out on the weekly plan introduced in 0014.
const SIX_DAY = {
  name: 'FitTrack 6-Day Balanced Routine',
  description:
    'Six training days: chest and triceps; back and biceps; legs and abs; shoulders and triceps; chest and biceps; back and legs.',
  start_day: 'Saturday',
  days: [
    ['Saturday', ['chest', 'triceps'], ['Bench Press', 'Incline Dumbbell Press', 'Chest Fly', 'Triceps Pushdown', 'Overhead Triceps Extension']],
    ['Sunday', ['back', 'biceps'], ['Lat Pulldown', 'Seated Row', 'One-arm Dumbbell Row', 'Biceps Curl', 'Hammer Curl']],
    ['Monday', ['legs', 'core'], ['Squat', 'Leg Press', 'Leg Curl', 'Calf Raise', 'Plank', 'Crunches']],
    ['Tuesday', ['shoulders', 'triceps'], ['Shoulder Press', 'Lateral Raise', 'Rear Delt Fly', 'Triceps Pushdown', 'Dips']],
    ['Wednesday', ['chest', 'biceps'], ['Incline Bench Press', 'Cable Fly', 'Push-ups', 'EZ-bar Curl', 'Dumbbell Curl']],
    ['Thursday', ['back', 'legs'], ['Lat Pulldown', 'Seated Row', 'Romanian Deadlift', 'Leg Extension', 'Calf Raise']],
    ['Friday', [], []],
  ],
};

export async function seedStarterData(db) {
  const settings = db.collection('app_settings');
  await settings.updateOne(
    { _id: 'bkash_number' },
    { $setOnInsert: { value: '', updated_at: new Date().toISOString(), updated_by: null } },
    { upsert: true }
  );
  const marker = await settings.findOne({ _id: 'starter_data_seeded' });
  if (marker) return;

  const now = new Date().toISOString();
  const exerciseIds = new Map();
  for (const [name, muscle_group, difficulty, description] of EXERCISES) {
    const res = await db.collection('exercises').findOneAndUpdate(
      { name },
      { $setOnInsert: { _id: crypto.randomUUID(), name, muscle_group, difficulty, description, is_active: true, created_at: now, updated_at: now } },
      { upsert: true, returnDocument: 'after' }
    );
    exerciseIds.set(name, res._id);
  }
  const equipmentIds = new Map();
  for (const [name, category, notes] of EQUIPMENT) {
    const res = await db.collection('equipment').findOneAndUpdate(
      { name },
      { $setOnInsert: { _id: crypto.randomUUID(), name, category, status: 'available', notes, created_at: now, updated_at: now } },
      { upsert: true, returnDocument: 'after' }
    );
    equipmentIds.set(name, res._id);
  }
  for (const [exerciseName, equipmentName] of EXERCISE_EQUIPMENT) {
    const exercise_id = exerciseIds.get(exerciseName);
    const equipment_id = equipmentIds.get(equipmentName);
    await db.collection('exercise_equipment').updateOne(
      { exercise_id, equipment_id },
      { $setOnInsert: { _id: crypto.randomUUID(), exercise_id, equipment_id, created_at: now } },
      { upsert: true }
    );
  }
  for (const [name, price, duration_days, description] of PLANS) {
    await db.collection('membership_plans').updateOne(
      { name },
      { $setOnInsert: { _id: crypto.randomUUID(), name, price, duration_days, description, is_active: true, created_at: now, updated_at: now } },
      { upsert: true }
    );
  }

  const existingSplit = await db.collection('workout_splits').findOne({ name: SIX_DAY.name });
  if (!existingSplit) {
    const splitId = crypto.randomUUID();
    await db.collection('workout_splits').insertOne({
      _id: splitId, name: SIX_DAY.name, description: SIX_DAY.description, start_day: SIX_DAY.start_day, created_at: now, updated_at: now,
    });
    for (const [day_name, groups, names] of SIX_DAY.days) {
      await db.collection('workout_split_days').insertOne({
        _id: crypto.randomUUID(), split_id: splitId, day_name, is_rest: groups.length === 0, muscle_groups: groups,
      });
      let position = 1;
      for (const exerciseName of names) {
        await db.collection('workout_split_exercises').insertOne({
          _id: crypto.randomUUID(), split_id: splitId, day_label: day_name, exercise_id: exerciseIds.get(exerciseName), position: position++, created_at: now,
        });
      }
    }
  }

  await settings.updateOne({ _id: 'starter_data_seeded' }, { $set: { value: now } }, { upsert: true });
}
