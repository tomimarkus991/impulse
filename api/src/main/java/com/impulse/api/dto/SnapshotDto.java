package com.impulse.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.util.List;

/** The mobile app's backup format v1. Uploaded as a whole and returned the same way. */
public record SnapshotDto(
        @NotNull @Pattern(regexp = "impulse", message = "must be \"impulse\"") String app,
        @NotNull @Min(value = 1, message = "must be 1") @Max(value = 1, message = "must be 1") Integer version,
        String exportedAt,
        @NotNull List<@Valid @NotNull SnapshotEventDto> events,
        @NotNull List<@Valid @NotNull SnapshotPresetDto> presets
) {}
