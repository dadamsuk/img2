import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const groups = sqliteTable("groups", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  inviteCode: text("invite_code").notNull().unique(),
  turnDeadlineHour: integer("turn_deadline_hour").notNull().default(20),
  createdBy: text("created_by").notNull().references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const groupMemberships = sqliteTable("group_memberships", {
  id: text("id").primaryKey(),
  groupId: text("group_id").notNull().references(() => groups.id),
  userId: text("user_id").notNull().references(() => users.id),
  totalScore: real("total_score").notNull().default(0),
  settingScore: real("setting_score").notNull().default(0),
  guessingScore: real("guessing_score").notNull().default(0),
  joinedAt: integer("joined_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const puzzles = sqliteTable("puzzles", {
  id: text("id").primaryKey(),
  groupId: text("group_id").notNull().references(() => groups.id),
  setterId: text("setter_id").notNull().references(() => users.id),
  turnDate: text("turn_date").notNull(), // YYYY-MM-DD
  subjectPhotoUrl: text("subject_photo_url").notNull(),
  subPortions: text("sub_portions").notNull().default("[]"), // JSON array of {x, y, width, height} percentages
  cluePhotoUrls: text("clue_photo_urls").notNull().default("[]"), // JSON array of URLs
  answerWhat: text("answer_what"), // null = N/A
  answerWho: text("answer_who"),
  answerWhere: text("answer_where"),
  answerWhen: text("answer_when"),
  textClues: text("text_clues").notNull().default("[]"), // JSON array of strings
  totalPoints: integer("total_points").notNull().default(25),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const guessSessions = sqliteTable("guess_sessions", {
  id: text("id").primaryKey(),
  puzzleId: text("puzzle_id").notNull().references(() => puzzles.id),
  guesserId: text("guesser_id").notNull().references(() => users.id),
  status: text("status", { enum: ["active", "completed", "conceded", "expired"] }).notNull().default("active"),
  revealsUsed: integer("reveals_used").notNull().default(0),
  revealHistory: text("reveal_history").notNull().default("[]"), // JSON array of {type, index}
  score: real("score").notNull().default(0),
  setterScore: real("setter_score").notNull().default(0),
  completedAt: integer("completed_at", { mode: "timestamp" }),
});

export const guesses = sqliteTable("guesses", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => guessSessions.id),
  field: text("field", { enum: ["what", "who", "where", "when"] }).notNull(),
  value: text("value").notNull(),
  revealLevel: integer("reveal_level").notNull().default(0),
  isCorrect: integer("is_correct", { mode: "boolean" }).notNull().default(false),
  pointsAwarded: real("points_awarded").notNull().default(0),
  llmReasoning: text("llm_reasoning"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
