RSpec.configure do |config|
  config.expect_with(:rspec) { |e| e.syntax = :expect }
  config.order = :random
  Kernel.srand config.seed
end
