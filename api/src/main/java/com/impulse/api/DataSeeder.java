package com.impulse.api;

import com.impulse.api.dto.SnapshotDto;
import com.impulse.api.dto.SnapshotEventDto;
import com.impulse.api.dto.SnapshotPresetDto;
import com.impulse.api.model.AppUser;
import com.impulse.api.repository.EventRepository;
import com.impulse.api.service.AuthService;
import com.impulse.api.service.SnapshotService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

/**
 * Gives the dev user ~3 months of workouts. Because it goes through a snapshot upload, the
 * account has a server copy, so the app's "Restore or use this phone's data" choice shows up.
 */
@Slf4j
@Component
@Profile("dev")
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {
    private static final ZoneId ZONE = ZoneId.of("Europe/Tallinn");
    private static final int DAYS = 90;

    private static final List<SnapshotPresetDto> PRESETS = List.of(
            new SnapshotPresetDto(1, "Push", "#1e3a8a", false, true, 1),
            new SnapshotPresetDto(2, "Pull", "#d6470e", false, true, 2),
            new SnapshotPresetDto(3, "Legs", "#4c1d95", false, true, 3),
            new SnapshotPresetDto(4, "Rest", "#14532d", false, true, 4)
    );

    private final AuthService authService;
    private final SnapshotService snapshotService;
    private final EventRepository eventRepository;

    @Override
    public void run(String... args) {
        AppUser devUser = authService.getOrCreateDevUser();
        if (eventRepository.countByUserId(devUser.getId()) > 0) {
            log.info("[DataSeeder] Seed data already present, skipping.");
            return;
        }

        log.info("[DataSeeder] Seeding dev data...");

        List<SnapshotEventDto> events = seedEvents();
        snapshotService.replace(devUser.getId(), new SnapshotDto(SnapshotService.APP, SnapshotService.VERSION, null, events, PRESETS));

        log.info("[DataSeeder] Done. Seeded {} events, {} presets.", events.size(), PRESETS.size());
    }

    // Push, Pull, Legs, Rest on repeat, one per day, ending today. Like the app, a day starts at local midnight.
    private List<SnapshotEventDto> seedEvents() {
        List<SnapshotEventDto> events = new ArrayList<>();
        LocalDate today = LocalDate.now(ZONE);

        for (int i = 0; i < DAYS; i++) {
            SnapshotPresetDto preset = PRESETS.get(i % PRESETS.size());
            Instant start = today.minusDays(DAYS - 1 - i).atStartOfDay(ZONE).toInstant();
            Instant end = start.plus(2, ChronoUnit.HOURS);
            events.add(new SnapshotEventDto(i + 1, preset.title(), preset.color(), start.toString(), end.toString(), false));
        }
        return events;
    }
}
