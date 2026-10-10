import { eventsTable, presetsTable } from "./schema";

export type SelectEvent = typeof eventsTable.$inferSelect;
export type CreateEvent = typeof eventsTable.$inferInsert;

export type SelectPreset = typeof presetsTable.$inferSelect;
export type CreatePreset = typeof presetsTable.$inferInsert;
