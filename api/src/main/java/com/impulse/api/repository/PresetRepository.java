package com.impulse.api.repository;

import com.impulse.api.model.Preset;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface PresetRepository extends JpaRepository<Preset, Long> {
    List<Preset> findByUserIdOrderByLocalId(Long userId);

    long countByUserId(Long userId);

    // One bulk statement instead of loading and deleting each row
    @Modifying
    @Query("delete from Preset p where p.userId = :userId")
    void deleteAllByUserId(Long userId);
}
