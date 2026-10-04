require "rails_helper"
RSpec.describe "Owner daily summary", type: :request do
  let(:owner) { create(:user, name: "Owner") }
  let(:staff) { create(:user, name: "Cashier") }
  let(:business) { create(:business, timezone: "Asia/Kolkata") }
  let!(:owner_member) { create(:business_membership, business: business, user: owner) }
  let!(:staff_member) { create(:business_membership, business: business, user: staff, role: "staff") }
  let!(:product) { create(:product, business: business, selling_price: 100) }
  def headers(actor = owner)
    {"Authorization" => "Bearer #{Session.issue!(actor)}", "X-Business-Id" => business.id.to_s}
  end
  def sell(actor, quantity, method, at, discount = "0")
    sale = Sales::Checkout.call(business: business, user: actor, attributes: {idempotency_key: SecureRandom.uuid, payment_method: method, discount: discount, items: [{product_id: product.id, quantity: quantity}]})
    sale.update_column(:created_at, Time.iso8601(at))
    sale
  end
  before do
    Inventory::AdjustStock.call(product: product, user: owner, quantity: 50, movement_type: "initial_stock", idempotency_key: "opening")
  end
  it "uses the business day and separates sellers, return processors and original payments" do
    older = sell(staff, "2", "cash", "2026-10-03T18:29:59Z")
    sell(staff, "2", "card", "2026-10-03T18:30:00Z")
    sell(owner, "1", "cash", "2026-10-04T18:29:59Z", "10")
    sell(owner, "1", "upi", "2026-10-04T18:30:00Z") # next local day
    returned = Sales::ReturnItems.call(sale: older, user: owner, attributes: {idempotency_key: "return", reason: "Wrong size", items: [{sale_item_id: older.sale_items.first.id, quantity: "1"}]})
    returned.update_column(:created_at, Time.iso8601("2026-10-04T08:00:00Z"))
    get "/api/v1/reports/daily_summary", params: {date: "2026-10-04"}, headers: headers
    expect(response).to have_http_status(:ok)
    data = response.parsed_body["data"]
    expect(data["totals"]).to include("bills" => 2, "sales" => "290.0", "discounts" => "10.0", "returns" => "100.0", "net" => "190.0")
    expect(data["employees"].find { |e| e["id"] == staff.id }).to include("sales" => "200.0", "returns_processed" => "0.0")
    expect(data["employees"].find { |e| e["id"] == owner.id }).to include("sales" => "90.0", "returns_processed" => "100.0")
    expect(data["payments"].find { |p| p["method"] == "cash" }).to include("sales" => "90.0", "returns" => "100.0", "net" => "-10.0")
    expect(data["returns"].first).to include("sale_id" => older.id, "processed_by" => "Owner", "seller" => "Cashier")
    get "/api/v1/reports/daily_summary", params: {date: "2026-10-04", employee_id: staff.id}, headers: headers
    expect(response.parsed_body["data"]["bills"].size).to eq(1)
    expect(response.parsed_body["data"]["returns"]).to be_empty
    expect(response.parsed_body["data"]["totals"]["sales"]).to eq("290.0")
  end
  it "denies staff and managers, allows admins and protects tenant boundaries" do
    %w[staff manager].each do |role|
      staff_member.update!(role: role)
      get "/api/v1/reports/daily_summary", headers: headers(staff)
      expect(response).to have_http_status(:forbidden)
    end
    staff_member.update!(role: "admin")
    get "/api/v1/reports/daily_summary", headers: headers(staff)
    expect(response).to have_http_status(:ok)
    other = create(:business)
    get "/api/v1/reports/daily_summary", headers: headers.merge("X-Business-Id" => other.id.to_s)
    expect(response).to have_http_status(:not_found)
    outsider = create(:user, name: "Private cashier")
    create(:business_membership, business: other, user: outsider)
    get "/api/v1/reports/daily_summary", params: {employee_id: outsider.id}, headers: headers
    expect(response.body).not_to include("Private cashier")
    expect(response.parsed_body["data"]["bills"]).to be_empty
  end
  it "keeps former employees in historical totals and paginates bills" do
    11.times { sell(staff, "1", "upi", "2026-10-04T08:00:00Z") }
    staff_member.destroy!
    get "/api/v1/reports/daily_summary", params: {date: "2026-10-04", sales_page: 2}, headers: headers
    data = response.parsed_body["data"]
    expect(data["bills"].size).to eq(1)
    expect(data["bills_meta"]).to include("total" => 11, "pages" => 2)
    expect(data["employees"].find { |e| e["id"] == staff.id }).to include("role" => nil, "sales" => "1100.0")
  end
  it "returns zero totals for an empty day and validates dates" do
    get "/api/v1/reports/daily_summary", params: {date: "2026-10-04"}, headers: headers
    expect(response.parsed_body["data"]["totals"]).to include("bills" => 0, "net" => "0.0")
    get "/api/v1/reports/daily_summary", params: {date: "bad-date"}, headers: headers
    expect(response).to have_http_status(:unprocessable_entity)
  end
end
