threads_count = ENV.fetch("RAILS_MAX_THREADS", 5)
threads threads_count, threads_count
port ENV.fetch("PORT", 3001)
plugin :tmp_restart
plugin :solid_queue if ENV["SOLID_QUEUE_IN_PUMA"] == "true"
