import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  pgEnum,
  unique,
} from "drizzle-orm/pg-core";

export const sessionStatusEnum = pgEnum("session_status", [
  "active",
  "closed",
]);

export const queueStatusEnum = pgEnum("queue_status", [
  "waiting",
  "checking",
  "done",
  "absent",
]);

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 6 }).unique().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  teacherPin: varchar("teacher_pin", { length: 128 }).notNull(),
  status: sessionStatusEnum("status").default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const students = pgTable(
  "students",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .references(() => sessions.id, { onDelete: "cascade" })
      .notNull(),
    studentId: varchar("student_id", { length: 64 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [unique().on(t.sessionId, t.studentId)]
);

export const queueEntries = pgTable(
  "queue_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .references(() => sessions.id, { onDelete: "cascade" })
      .notNull(),
    studentId: uuid("student_id")
      .references(() => students.id, { onDelete: "cascade" })
      .notNull(),
    position: integer("position").notNull(),
    status: queueStatusEnum("status").default("waiting").notNull(),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
    checkStartedAt: timestamp("check_started_at"),
    checkEndedAt: timestamp("check_ended_at"),
    notes: text("notes"),
  },
  (t) => [unique().on(t.sessionId, t.studentId)]
);
