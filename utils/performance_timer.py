"""
Performance timing utilities for SageUtils.
Provides comprehensive timing functionality to measure initialization and runtime performance.
"""

import time
import functools
import logging
from typing import Dict, List, Optional, Any, Callable
from contextlib import contextmanager
from datetime import datetime

class PerformanceTimer:
    """
    A comprehensive performance timing class for measuring various operations.
    Supports nested timing, categories, and detailed reporting.
    """
    
    def __init__(self, name: str = "SageUtils"):
        self.name = name
        self.timings: Dict[str, List[float]] = {}
        self.nested_timings: Dict[str, Dict] = {}
        self.initialization_times: Dict[str, float] = {}
        self.start_times: Dict[str, float] = {}
        self.logger = logging.getLogger(f"sageutils.timing.{name.lower()}")
        self.enabled = True
        
        # Track initialization start
        self.init_start_time = time.perf_counter()
        self.initialization_complete = False
        
    def enable(self):
        """Enable timing measurements."""
        self.enabled = True
        
    def disable(self):
        """Disable timing measurements."""
        self.enabled = False
        
    def start_timer(self, operation: str) -> None:
        """Start timing an operation."""
        if not self.enabled:
            return
            
        self.start_times[operation] = time.perf_counter()
        
    def end_timer(self, operation: str) -> float:
        """End timing an operation and return duration."""
        if not self.enabled:
            return 0.0
            
        if operation not in self.start_times:
            self.logger.warning(f"Timer '{operation}' was never started")
            return 0.0
            
        duration = time.perf_counter() - self.start_times[operation]
        
        # Add to timings list
        if operation not in self.timings:
            self.timings[operation] = []
        self.timings[operation].append(duration)
        
        # Remove from active timers
        del self.start_times[operation]
        
        return duration
    
    @contextmanager
    def timer_context(self, operation: str):
        """Context manager for timing operations."""
        if not self.enabled:
            yield
            return
            
        start_time = time.perf_counter()
        try:
            yield
        finally:
            duration = time.perf_counter() - start_time
            if operation not in self.timings:
                self.timings[operation] = []
            self.timings[operation].append(duration)
            
    def time_function(self, operation_name: Optional[str] = None):
        """Decorator for timing function calls."""
        def decorator(func: Callable) -> Callable:
            name = operation_name or f"{func.__module__}.{func.__name__}"
            
            @functools.wraps(func)
            def wrapper(*args, **kwargs):
                if not self.enabled:
                    return func(*args, **kwargs)
                    
                with self.timer_context(name):
                    return func(*args, **kwargs)
            return wrapper
        return decorator
    
    def record_initialization_milestone(self, milestone: str) -> None:
        """Record an initialization milestone."""
        if not self.enabled:
            return
            
        current_time = time.perf_counter()
        duration_from_start = current_time - self.init_start_time
        self.initialization_times[milestone] = duration_from_start
        
        self.logger.info(f"Initialization milestone '{milestone}': {duration_from_start:.4f}s from start")
    
    def complete_initialization(self) -> float:
        """Mark initialization as complete and return total time."""
        if not self.enabled:
            return 0.0
            
        if self.initialization_complete:
            return self.get_total_initialization_time()
            
        total_time = time.perf_counter() - self.init_start_time
        self.initialization_times['__complete__'] = total_time
        self.initialization_complete = True
        
        self.logger.info(f"Total initialization time: {total_time:.4f}s")
        return total_time
    
    def get_total_initialization_time(self) -> float:
        """Get the total initialization time."""
        if '__complete__' in self.initialization_times:
            return self.initialization_times['__complete__']
        elif self.initialization_times:
            return max(self.initialization_times.values())
        else:
            return 0.0
    
    def get_stats(self, operation: str) -> Dict[str, float]:
        """Get statistics for a specific operation."""
        if operation not in self.timings:
            return {}
            
        times = self.timings[operation]
        if not times:
            return {}
            
        return {
            'count': len(times),
            'total': sum(times),
            'average': sum(times) / len(times),
            'min': min(times),
            'max': max(times),
            'last': times[-1]
        }
    
    def get_all_stats(self) -> Dict[str, Dict[str, float]]:
        """Get statistics for all operations."""
        stats = {}
        for operation in self.timings:
            stats[operation] = self.get_stats(operation)
        return stats
    
    def get_initialization_report(self) -> str:
        """Generate a detailed initialization report."""
        if not self.initialization_times:
            return f"No initialization timing data for {self.name}"
            
        report = [f"\n=== {self.name} Initialization Timing Report ==="]
        
        # Sort milestones by time
        sorted_milestones = sorted(
            [(k, v) for k, v in self.initialization_times.items() if k != '__complete__'],
            key=lambda x: x[1]
        )
        
        # Add incremental times
        prev_time = 0.0
        for milestone, total_time in sorted_milestones:
            incremental = total_time - prev_time
            report.append(f"  {milestone}: {total_time:.4f}s (+{incremental:.4f}s)")
            prev_time = total_time
            
        if '__complete__' in self.initialization_times:
            total = self.initialization_times['__complete__']
            report.append(f"  TOTAL: {total:.4f}s")
        
        return "\n".join(report)
    
    def get_runtime_report(self) -> str:
        """Generate a detailed runtime performance report."""
        if not self.timings:
            return f"No runtime timing data for {self.name}"
            
        report = [f"\n=== {self.name} Runtime Performance Report ==="]
        
        # Sort operations by total time
        sorted_ops = sorted(
            [(op, self.get_stats(op)) for op in self.timings],
            key=lambda x: x[1].get('total', 0),
            reverse=True
        )
        
        for operation, stats in sorted_ops:
            if not stats:
                continue
                
            report.append(f"  {operation}:")
            report.append(f"    Calls: {stats['count']}")
            report.append(f"    Total: {stats['total']:.4f}s")
            report.append(f"    Average: {stats['average']:.4f}s")
            report.append(f"    Min: {stats['min']:.4f}s")
            report.append(f"    Max: {stats['max']:.4f}s")
            report.append("")
        
        return "\n".join(report)
    
    def get_full_report(self) -> str:
        """Generate a complete performance report."""
        init_report = self.get_initialization_report()
        runtime_report = self.get_runtime_report()
        return f"{init_report}\n{runtime_report}"
    
    def print_report(self):
        """Print the full performance report to console."""
        print(self.get_full_report())
    
    def log_report(self, level: int = logging.INFO):
        """Log the full performance report."""
        self.logger.log(level, self.get_full_report())
    
    def reset(self):
        """Reset all timing data."""
        self.timings.clear()
        self.nested_timings.clear()
        self.initialization_times.clear()
        self.start_times.clear()
        self.init_start_time = time.perf_counter()
        self.initialization_complete = False
    
    def export_to_dict(self) -> Dict[str, Any]:
        """Export timing data as a dictionary for serialization."""
        return {
            'name': self.name,
            'initialization_times': self.initialization_times.copy(),
            'runtime_stats': self.get_all_stats(),
            'total_initialization_time': self.get_total_initialization_time(),
            'initialization_complete': self.initialization_complete,
            'timestamp': datetime.now().isoformat()
        }

# Global timer instances
python_timer = PerformanceTimer("Python")
server_timer = PerformanceTimer("Server")

# Convenience functions
def start_timer(operation: str, timer: PerformanceTimer = python_timer):
    """Start timing an operation."""
    timer.start_timer(operation)

def end_timer(operation: str, timer: PerformanceTimer = python_timer) -> float:
    """End timing an operation."""
    return timer.end_timer(operation)

def timer_context(operation: str, timer: PerformanceTimer = python_timer):
    """Context manager for timing operations."""
    return timer.timer_context(operation)

def time_function(operation_name: Optional[str] = None, timer: PerformanceTimer = python_timer):
    """Decorator for timing function calls."""
    return timer.time_function(operation_name)

def record_initialization_milestone(milestone: str, timer: PerformanceTimer = python_timer):
    """Record an initialization milestone."""
    timer.record_initialization_milestone(milestone)

def complete_initialization(timer: PerformanceTimer = python_timer) -> float:
    """Mark initialization as complete."""
    return timer.complete_initialization()

def get_timing_report(timer: PerformanceTimer = python_timer) -> str:
    """Get a timing report."""
    return timer.get_full_report()

def print_timing_report(timer: PerformanceTimer = python_timer):
    """Print a timing report."""
    timer.print_report()

def log_timing_report(timer: PerformanceTimer = python_timer, level: int = logging.INFO):
    """Log a timing report."""
    timer.log_report(level)

# Enable detailed logging for timing if debug mode is enabled
def setup_timing_logging():
    """Setup logging for performance timing."""
    logger = logging.getLogger("sageutils.timing")
    if not logger.handlers:
        handler = logging.StreamHandler()
        formatter = logging.Formatter(
            '[TIMING] %(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)

# Initialize logging
setup_timing_logging()
