package com.impulse.api.repository;

import com.impulse.api.model.Event;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface EventRepository extends JpaRepository<Event, Long> {
    List<Event> findByUserIdOrderByLocalId(Long userId);

    long countByUserId(Long userId);

    // One bulk statement instead of loading and deleting each row
    @Modifying
    @Query("delete from Event e where e.userId = :userId")
    void deleteAllByUserId(Long userId);
}
