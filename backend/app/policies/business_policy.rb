class BusinessPolicy
  def initialize(membership, _record)
    @role = membership.role
  end
  def write?
    %w[owner admin manager].include?(@role)
  end
  def stock?
    %w[owner admin manager staff].include?(@role)
  end
  def manage?
    %w[owner admin].include?(@role)
  end
  def report?
    write?
  end
end
