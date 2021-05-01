-- CreateTable
CREATE TABLE "VcMoverGuildSettings" (
    "guildId" VARCHAR(20) NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY ("guildId")
);

CREATE CONSTRAINT TRIGGER "VcMoverGuildSettings_insert_trigger"
    AFTER INSERT
    ON "VcMoverGuildSettings"
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
EXECUTE FUNCTION trigger_notify_entity_insert_or_update();

CREATE CONSTRAINT TRIGGER "VcMoverGuildSettings_update_trigger"
    AFTER UPDATE
    ON "VcMoverGuildSettings"
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    WHEN (OLD <> NEW)
EXECUTE FUNCTION trigger_notify_entity_insert_or_update();

CREATE CONSTRAINT TRIGGER "VcMoverGuildSettings_delete_trigger"
    AFTER DELETE
    ON "VcMoverGuildSettings"
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
EXECUTE FUNCTION trigger_notify_entity_delete('guildId');
