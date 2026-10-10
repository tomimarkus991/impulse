package com.impulse.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record SnapshotPresetDto(
        @NotNull Integer id,
        @NotBlank String title,
        @NotBlank String color,
        Boolean locked,
        Boolean pinned,
        Integer position
) {}
