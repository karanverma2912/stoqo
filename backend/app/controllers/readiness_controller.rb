# Dependency readiness is separate from /up so a datastore outage does not
# cause the platform to repeatedly restart an otherwise healthy Rails process.
class ReadinessController < ActionController::API
  def show
    response.headers["Cache-Control"] = "no-store"
    ActiveRecord::Base.connection_pool.with_connection { |connection| connection.select_value("SELECT 1") }
    if Rails.application.config.active_job.queue_adapter == :sidekiq
      raise "Queue unavailable" unless Sidekiq.redis { |connection| connection.call("PING") } == "PONG"
    elsif Rails.application.config.active_job.queue_adapter == :solid_queue
      SolidQueue::Job.limit(1).count
    end
    render json: {status: "ready"}
  rescue StandardError => error
    Rails.logger.warn("Readiness failed: #{error.class.name}")
    render json: {status: "unavailable"}, status: :service_unavailable
  end
end
