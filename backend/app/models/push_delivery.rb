class PushDelivery < ApplicationRecord
  belongs_to :notification
  belongs_to :device_registration
end
