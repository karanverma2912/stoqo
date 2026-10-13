require "rails_helper"
require "webmock/rspec"

RSpec.describe "Store assistant" do
  let!(:owner) { create(:user) }
  let!(:staff) { create(:user) }
  let!(:business) { create(:business, ai_enabled: true) }
  let!(:owner_member) { create(:business_membership, business: business, user: owner, role: "owner") }
  let!(:staff_member) { create(:business_membership, business: business, user: staff, role: "staff") }
  let!(:product) { create(:product, business: business, purchase_price: 125, selling_price: 200) }
  def tools(user) = Assistant::Tools.new(business: business, user: user)

  it "scopes product lookup and suppresses costs for staff" do
    other = create(:product, name: "Other shop secret")
    result = tools(staff).call("inventory_search", {})
    expect(result[:products].map { |p| p[:id] }).to eq([product.id])
    expect(result[:products].first).not_to have_key(:purchase_price)
    expect { tools(staff).call("team_list", {}) }.to raise_error(Pundit::NotAuthorizedError)
    expect { tools(staff).call("propose_stock_change", {product_id: other.id, quantity: "1", movement_type: "stock_in"}) }.to raise_error(ActiveRecord::RecordNotFound)
  end

  it "prepares stock changes without executing them and confirms them exactly once" do
    tools(owner).call("propose_stock_change", {product_id: product.id, quantity: "2", movement_type: "stock_in"})
    action = AssistantAction.last
    expect(product.reload.current_stock).to eq(0)
    first = Assistant::ConfirmAction.call(action: action, user: owner)
    second = Assistant::ConfirmAction.call(action: action.reload, user: owner)
    expect(second).to eq(first.stringify_keys)
    expect(product.reload.current_stock).to eq(2)
    expect(product.stock_movements.count).to eq(1)
  end

  it "checks the actor, expiry and current subscription again at confirmation" do
    tools(owner).call("propose_stock_change", {product_id: product.id, quantity: "2", movement_type: "stock_in"})
    action = AssistantAction.last
    expect { Assistant::ConfirmAction.call(action: action, user: staff) }.to raise_error(Pundit::NotAuthorizedError)
    action.update!(expires_at: 1.minute.ago)
    expect { Assistant::ConfirmAction.call(action: action, user: owner) }.to raise_error(ArgumentError)
    action.update!(expires_at: 1.minute.from_now)
    business.update!(trial_ends_at: 1.day.ago)
    expect { Assistant::ConfirmAction.call(action: action, user: owner) }.to raise_error(ArgumentError)
    expect(product.reload.current_stock).to eq(0)
  end

  it "does not permit a demoted manager to confirm a pending invitation" do
    tools(owner).call("propose_invitation", {email: "invitee@example.test", role: "admin"})
    owner_member.update!(role: "manager")
    expect { Assistant::ConfirmAction.call(action: AssistantAction.last, user: owner) }.to raise_error(Pundit::NotAuthorizedError)
    expect(business.team_invitations.count).to eq(0)
  end

  it "counts failed provider calls against the daily budget" do
    allow(Assistant::Gemini).to receive(:configured?).and_return(true)
    allow(Assistant::Gemini).to receive(:generate).and_raise(Assistant::Unavailable, "Provider unavailable")
    expect { Assistant::Chat.call(business: business, user: owner, message: "What is running low?") }.to raise_error(Assistant::Unavailable)
    expect(AiDailyBudget.last.calls).to eq(1)
  end

  it "drops prior privileged context when the user's role changes" do
    AssistantConversation.create!(business: business, user: owner, permission_role: "owner", messages: [{"role" => "model", "parts" => [{"text" => "Private purchase prices"}]}])
    owner_member.update!(role: "staff")
    allow(Assistant::Gemini).to receive(:configured?).and_return(true)
    expect(Assistant::Gemini).to receive(:generate) do |contents:, **|
      expect(contents.to_json).not_to include("Private purchase prices")
      [{"text" => "Your inventory is available."}]
    end
    Assistant::Chat.call(business: business, user: owner, message: "Show my stock")
  end
end
