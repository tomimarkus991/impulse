package com.impulse.api.dto;

import java.time.Instant;

public record SnapshotInfoDto(
        Instant receivedAt,
        long events,
        long presets
) {}
