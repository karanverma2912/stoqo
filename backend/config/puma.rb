threads_count = ENV.fetch("RAILS_MAX_THREADS", 5)
threads threads_count, threads_count
port ENV.fetch("PORT", 3001)
plugin :tmp_restart
if ENV["SOLID_QUEUE_IN_PUMA"] == "true"
  # Share the pilot's small instance with the queue instead of forking a cluster.
  workers 0
  plugin :solid_queue
  solid_queue_mode ENV.fetch("SOLID_QUEUE_SUPERVISOR_MODE", "async").to_sym
end
