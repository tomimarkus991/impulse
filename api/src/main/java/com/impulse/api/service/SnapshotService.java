package com.impulse.api.service;

import com.impulse.api.dto.*;
import com.impulse.api.model.AppUser;
import com.impulse.api.model.Event;
import com.impulse.api.model.Preset;
import com.impulse.api.repository.AppUserRepository;
import com.impulse.api.repository.EventRepository;
import com.impulse.api.repository.PresetRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.IntStream;

/** The phone uploads all its data at once; the server copy is replaced, never merged. */
@Service
@RequiredArgsConstructor
public class SnapshotService {

    public static final String APP = "impulse";
    public static final int VERSION = 1;

    // Same shape as JavaScript's Date.toISOString(), so dates round-trip unchanged
    private static final DateTimeFormatter JS_ISO = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'").withZone(ZoneOffset.UTC);

    private final AppUserRepository userRepository;
    private final EventRepository eventRepository;
    private final PresetRepository presetRepository;

    @Transactional
    public SnapshotInfoDto replace(Long userId, SnapshotDto snapshot) {
        AppUser user = getUser(userId);

        // Build everything first so a bad row fails before anything is deleted
        List<Event> events = toEvents(userId, snapshot.events());
        List<Preset> presets = snapshot.presets().stream().map(preset -> toPreset(userId, preset)).toList();

        eventRepository.deleteAllByUserId(userId);
        presetRepository.deleteAllByUserId(userId);
        eventRepository.saveAll(events);
        presetRepository.saveAll(presets);

        user.setLastSnapshotAt(Instant.now().truncatedTo(ChronoUnit.MILLIS));

        return new SnapshotInfoDto(user.getLastSnapshotAt(), events.size(), presets.size());
    }

    @Transactional(readOnly = true)
    public SnapshotDto get(Long userId) {
        getUser(userId);

        List<SnapshotEventDto> events = eventRepository.findByUserIdOrderByLocalId(userId).stream()
                .map(event -> new SnapshotEventDto(event.getLocalId(), event.getTitle(), event.getColor(),
                        JS_ISO.format(event.getStartAt()), JS_ISO.format(event.getEndAt()), event.isLocked()))
                .toList();
        List<SnapshotPresetDto> presets = presetRepository.findByUserIdOrderByLocalId(userId).stream()
                .map(preset -> new SnapshotPresetDto(preset.getLocalId(), preset.getTitle(), preset.getColor(),
                        preset.isLocked(), preset.isPinned(), preset.getPosition()))
                .toList();

        return new SnapshotDto(APP, VERSION, JS_ISO.format(Instant.now()), events, presets);
    }

    /** Null until the account has uploaded once. */
    public SnapshotInfoDto getInfo(AppUser user) {
        if (user.getLastSnapshotAt() == null) {
            return null;
        }
        return new SnapshotInfoDto(
                user.getLastSnapshotAt(),
                eventRepository.countByUserId(user.getId()),
                presetRepository.countByUserId(user.getId())
        );
    }

    private AppUser getUser(Long userId) {
        // The token outlived its account, so the phone should sign in again
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }

    private List<Event> toEvents(Long userId, List<SnapshotEventDto> events) {
        List<Event> result = new ArrayList<>(events.size());
        IntStream.range(0, events.size()).forEach(index -> {
            SnapshotEventDto event = events.get(index);
            result.add(Event.builder()
                    .userId(userId)
                    .localId(event.id())
                    .title(event.title())
                    .color(event.color())
                    .startAt(parseInstant(event.start(), "events[" + index + "].start"))
                    .endAt(parseInstant(event.end(), "events[" + index + "].end"))
                    .locked(Boolean.TRUE.equals(event.locked()))
                    .build());
        });
        return result;
    }

    private Preset toPreset(Long userId, SnapshotPresetDto preset) {
        return Preset.builder()
                .userId(userId)
                .localId(preset.id())
                .title(preset.title())
                .color(preset.color())
                .locked(Boolean.TRUE.equals(preset.locked()))
                .pinned(Boolean.TRUE.equals(preset.pinned()))
                .position(preset.position() != null ? preset.position() : 0)
                .build();
    }

    private Instant parseInstant(String value, String field) {
        try {
            return Instant.parse(value);
        } catch (DateTimeParseException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " is not a valid date");
        }
    }
}
