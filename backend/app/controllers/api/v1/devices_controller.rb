class Api::V1::DevicesController < ApplicationController
  def create
    a = params.require(:device).permit(:installation_id, :expo_push_token, :platform)
    device = nil
    DeviceRegistration.transaction do
      prior = DeviceRegistration.find_by(expo_push_token: a[:expo_push_token])
      # The same physical phone can change accounts; the new login replaces its old registration.
      prior.destroy! if prior && (prior.user_id != current_user.id || prior.installation_id != a[:installation_id])
      device = current_user.device_registrations.find_or_initialize_by(installation_id: a[:installation_id])
      device.update!(a.merge(session: @session, enabled: true, last_seen_at: Time.current))
    end
    data({id: device.id, enabled: device.enabled}, status: :created)
  end
  def destroy
    current_user.device_registrations.find(params[:id]).destroy!
    data({removed: true})
  end
end
